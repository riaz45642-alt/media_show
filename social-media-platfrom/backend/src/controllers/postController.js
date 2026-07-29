import { pool } from '../config/db.js'
import { moderate } from '../services/moderationService.js'

export async function listPosts(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, p.author_id AS user_id, p.body AS text_content,
              p.like_count AS likes_count, up.display_name AS author
       FROM posts p JOIN user_profiles up ON up.user_id = p.author_id
       WHERE p.moderation_status = 'safe' AND p.deleted_at IS NULL
       ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC LIMIT 50`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function createPost(req, res, next) {
  try {
    const { text, imageBase64, imageMimeType } = req.body
    const image = imageBase64 ? { base64: imageBase64, mimeType: imageMimeType } : undefined

    const result = await moderate({ text, image, userId: req.user.id, contentType: 'post' })

    const { rows } = await pool.query(
      `INSERT INTO posts (author_id, body, moderation_status, risk_score, moderation_reason, published_at)
       VALUES ($1,$2,$3,$4,$5,CASE WHEN $3 = 'safe' THEN now() ELSE NULL END)
       RETURNING *, author_id AS user_id, body AS text_content, like_count AS likes_count`,
      [
        req.user.id,
        text || '',
        result.status,
        result.riskScore,
        result.reason,
      ]
    )

    if (result.status === 'rejected') {
      return res.status(422).json({ message: 'Post rejected by moderation', reason: result.reason, post: rows[0] })
    }

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
      `UPDATE posts SET body = $1, moderation_status = $2, risk_score = $3,
              moderation_reason = $4, published_at = CASE WHEN $2 = 'safe' THEN COALESCE(published_at, now()) ELSE NULL END
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
    }
    const { rows } = await pool.query(
      `UPDATE posts SET like_count = (SELECT count(*) FROM reactions WHERE post_id = $1)
       WHERE id = $1 RETURNING like_count`,
      [req.params.postId]
    )
    res.json({ liked: !removed.rowCount, likeCount: rows[0]?.like_count || 0 })
  } catch (err) { next(err) }
}
