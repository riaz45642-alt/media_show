import { pool } from '../config/db.js'
import { createNotification } from '../services/notificationService.js'
import { moderate } from '../services/moderationService.js'
import { moderateUploadedMedia } from '../services/mediaModerationService.js'
import fs from 'node:fs/promises'
import { adjustReputation } from '../services/reputationService.js'

const POST_SELECT = `
  SELECT p.*, p.author_id AS user_id, p.body AS text_content,
         p.like_count AS likes_count, up.display_name AS author,
         avatar.storage_path AS avatar_url,
         media.items AS media,
         media.image_url,
         media.video_url,
         comments.items AS comments
  FROM posts p
  JOIN user_profiles up ON up.user_id = p.author_id
  LEFT JOIN media_assets avatar ON avatar.id = up.avatar_media_id AND avatar.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT COALESCE(
             jsonb_agg(jsonb_build_object(
               'id', ma.id, 'type', ma.kind, 'url', ma.storage_path,
               'mimeType', ma.mime_type, 'position', pm.position
             ) ORDER BY pm.position), '[]'::jsonb
           ) AS items,
           min(ma.storage_path) FILTER (WHERE ma.kind = 'image') AS image_url,
           min(ma.storage_path) FILTER (WHERE ma.kind = 'video') AS video_url
    FROM post_media pm
    JOIN media_assets ma ON ma.id = pm.media_id AND ma.deleted_at IS NULL
    WHERE pm.post_id = p.id
  ) media ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(
             jsonb_agg(jsonb_build_object(
               'id', c.id, 'text_content', c.body, 'author', cup.display_name,
               'user_id', c.author_id, 'created_at', c.created_at,
               'avatar_url', ca.storage_path
             ) ORDER BY c.created_at), '[]'::jsonb
           ) AS items
    FROM comments c
    JOIN user_profiles cup ON cup.user_id = c.author_id
    LEFT JOIN media_assets ca ON ca.id = cup.avatar_media_id AND ca.deleted_at IS NULL
    WHERE c.post_id = p.id AND c.deleted_at IS NULL AND c.moderation_status = 'safe'
  ) comments ON true`

function publicApiOrigin(req) {
  return (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
}

function mediaKind(mimeType) {
  return mimeType.startsWith('video/') ? 'video' : 'image'
}

export async function listPosts(req, res, next) {
  try {
    const { rows } = await pool.query(
      `${POST_SELECT}
       LEFT JOIN user_settings author_settings ON author_settings.user_id = p.author_id
       WHERE p.moderation_status = 'safe' AND p.deleted_at IS NULL
         AND (
           (
             COALESCE(author_settings.profile_visibility, 'public'::visibility) = 'public'::visibility
             AND p.visibility = 'public'::visibility
           )
           OR ($1::uuid IS NOT NULL AND p.author_id = $1::uuid)
           OR (
             $1::uuid IS NOT NULL
             AND p.visibility IN ('public'::visibility, 'followers'::visibility)
             AND EXISTS (
               SELECT 1 FROM follows approved
               WHERE approved.follower_id = $1::uuid AND approved.followed_id = p.author_id
             )
           )
           OR (
             $1::uuid IS NOT NULL
             AND p.visibility = 'friends'::visibility
             AND EXISTS (
               SELECT 1 FROM follows outbound
               WHERE outbound.follower_id = $1::uuid AND outbound.followed_id = p.author_id
             )
             AND EXISTS (
               SELECT 1 FROM follows inbound
               WHERE inbound.follower_id = p.author_id AND inbound.followed_id = $1::uuid
             )
           )
         )
       ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC LIMIT 50`,
      [req.user?.id || null]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function createPost(req, res, next) {
  try {
    const { text } = req.body
    const files = req.files || []
    if (!text?.trim() && files.length === 0) {
      return res.status(400).json({ message: 'Post needs text, an image, or a video' })
    }
    let result
    let mediaResults
    try {
      ;[result, mediaResults] = await Promise.all([
        moderate({ text, userId: req.user.id, contentType: 'post' }),
        moderateUploadedMedia(files),
      ])
    } catch (error) {
      await Promise.allSettled(files.map((file) => fs.unlink(file.path)))
      throw error
    }

    const unavailable = mediaResults.find((decision) => !decision.available)
    if (unavailable) {
      await Promise.allSettled(files.map((file) => fs.unlink(file.path)))
      if (unavailable.validationError) {
        return res.status(unavailable.httpStatus || 422).json({
          message: unavailable.userMessage,
          reason: unavailable.userMessage,
          code: unavailable.code,
          fileName: unavailable.fileName,
          mediaType: unavailable.mediaType,
        })
      }
      return res.status(503).json({
        message: 'Media moderation is temporarily unavailable. Please try again later.',
        reason: 'Media moderation is temporarily unavailable. Please try again later.',
        code: unavailable.reason,
        fileName: unavailable.fileName,
      })
    }

    const rejectedMedia = mediaResults.find((decision) => !decision.safe)
    if (rejectedMedia) {
      await Promise.allSettled(files.map((file) => fs.unlink(file.path)))
      if (result.status !== 'rejected') await adjustReputation(req.user.id, -10, 'media_moderation_rejection', 'post')
      const kind = rejectedMedia.mediaType.startsWith('video/') ? 'Video' : 'Image'
      return res.status(422).json({
        message: `${kind} rejected`,
        reason: rejectedMedia.reason || `${kind} violates our community guidelines.`,
        categories: rejectedMedia.categories,
        confidence: rejectedMedia.confidence,
        fileName: rejectedMedia.fileName,
        mediaType: rejectedMedia.mediaType,
      })
    }
    const client = await pool.connect()
    let post
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `INSERT INTO posts (author_id, body, moderation_status, risk_score, moderation_reason, published_at)
         VALUES ($1,$2,$3::moderation_state,$4,$5,
                 CASE WHEN $3::moderation_state = 'safe'::moderation_state THEN now() ELSE NULL END)
         RETURNING *`,
        [req.user.id, text || '', result.status, result.riskScore, result.reason]
      )
      post = rows[0]

      for (const [position, file] of files.entries()) {
        const url = `${publicApiOrigin(req)}/uploads/${encodeURIComponent(file.filename)}`
        const asset = await client.query(
          `INSERT INTO media_assets
             (owner_id, kind, storage_bucket, storage_path, mime_type, byte_size, moderation_status)
           VALUES ($1,$2::media_kind,'uploads',$3,$4,$5,$6::moderation_state)
           RETURNING id`,
          [req.user.id, mediaKind(file.mimetype), url, file.mimetype, file.size, result.status]
        )
        await client.query(
          `INSERT INTO post_media (post_id, media_id, position) VALUES ($1,$2,$3)`,
          [post.id, asset.rows[0].id, position]
        )
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      await Promise.allSettled(files.map((file) => fs.unlink(file.path)))
      throw error
    } finally {
      client.release()
    }

    const { rows } = await pool.query(`${POST_SELECT} WHERE p.id = $1`, [post.id])

    if (result.status === 'rejected') {
      return res.status(422).json({ message: 'Post rejected by moderation', reason: result.reason, post: rows[0] })
    }

    if (result.status === 'safe') await adjustReputation(req.user.id, 2, 'approved_post', 'post')
    res.status(201).json({ post: rows[0], moderation: result })
  } catch (err) {
    next(err)
  }
}

export async function updatePost(req, res, next) {
  try {
    const { text } = req.body
    const result = await moderate({ text, userId: req.user.id, contentType: 'post' })
    if (result.status === 'rejected') return res.status(422).json({ message: 'Post rejected by moderation', reason: result.reason })
    const { rows } = await pool.query(
      `UPDATE posts SET body = $1, moderation_status = $2::moderation_state, risk_score = $3,
              moderation_reason = $4, published_at = CASE
                WHEN $2::moderation_state = 'safe'::moderation_state THEN COALESCE(published_at, now())
                ELSE NULL
              END
       WHERE id = $5 AND author_id = $6 AND deleted_at IS NULL RETURNING *`,
      [text, result.status, result.riskScore, result.reason, req.params.postId, req.user.id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'Post not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

export async function deletePost(req, res, next) {
  try {
    const { rowCount } = await pool.query(
      'UPDATE posts SET deleted_at = now() WHERE id = $1 AND author_id = $2 AND deleted_at IS NULL',
      [req.params.postId, req.user.id]
    )
    if (!rowCount) return res.status(404).json({ message: 'Post not found' })
    res.status(204).end()
  } catch (err) { next(err) }
}

export async function toggleReaction(req, res, next) {
  try {
    const removed = await pool.query('DELETE FROM reactions WHERE user_id = $1 AND post_id = $2 RETURNING post_id', [req.user.id, req.params.postId])
    if (!removed.rowCount) {
      await pool.query(`INSERT INTO reactions (user_id, post_id, reaction) VALUES ($1,$2,'like')`, [req.user.id, req.params.postId])
      const owner = await pool.query(`SELECT author_id FROM posts WHERE id = $1`, [req.params.postId])
      if (owner.rows[0] && owner.rows[0].author_id !== req.user.id) {
        await createNotification({ userId: owner.rows[0].author_id, actorId: req.user.id, category: 'likes', type: 'like', text: 'Someone liked your post', link: `/post/${req.params.postId}`, entityType: 'post', entityId: req.params.postId })
        await adjustReputation(owner.rows[0].author_id, 1, 'received_like', 'post')
      }
    }
    const { rows } = await pool.query(
      `UPDATE posts SET like_count = (SELECT count(*) FROM reactions WHERE post_id = $1)
       WHERE id = $1 RETURNING like_count`,
      [req.params.postId]
    )
    res.json({ liked: !removed.rowCount, likeCount: rows[0]?.like_count || 0 })
  } catch (err) { next(err) }
}
