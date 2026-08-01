import fs from 'node:fs/promises'
import { pool } from '../config/db.js'
import { moderateUploadedMedia } from '../services/mediaModerationService.js'
import { moderate } from '../services/moderationService.js'
import { deletePublicMedia, uploadPublicMedia } from '../services/objectStorageService.js'
import { deleteStoryAndMedia } from '../services/storyCleanupService.js'

const kindFor = (mime = '') => mime.startsWith('video/') ? 'video' : 'image'
const logStage = (req, event, extra = {}) => console.info(JSON.stringify({
  level: 'info', event, requestId: req.requestId, userId: req.user?.id, ...extra,
}))
const logFailure = (req, event, error, extra = {}) => console.error(JSON.stringify({
  level: 'error', event, requestId: req.requestId, userId: req.user?.id, ...extra,
  error: { name: error.name, message: error.message, code: error.code, status: error.status, stack: error.stack },
}))

export async function listStories(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.author_id, s.caption, s.created_at, s.expires_at,
              up.display_name AS author_name, up.username, avatar.storage_path AS author_avatar,
              ma.kind AS media_type, ma.storage_path AS media_url,
              (COALESCE(settings.profile_visibility, 'public'::visibility) <> 'public') AS is_private,
              EXISTS (SELECT 1 FROM follows vf WHERE vf.follower_id = $1::uuid AND vf.followed_id = s.author_id) AS viewer_follows,
              EXISTS (SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = $1::uuid) AS viewed,
              EXISTS (SELECT 1 FROM story_reactions sr WHERE sr.story_id = s.id AND sr.user_id = $1::uuid) AS liked_by_me,
              (SELECT count(*)::int FROM story_reactions sr WHERE sr.story_id = s.id) AS like_count
       FROM stories s
       JOIN users author ON author.id = s.author_id AND author.deleted_at IS NULL AND author.status = 'active'
       JOIN user_profiles up ON up.user_id = s.author_id
       LEFT JOIN user_settings settings ON settings.user_id = s.author_id
       JOIN story_media sm ON sm.story_id = s.id
       JOIN media_assets ma ON ma.id = sm.media_id AND ma.deleted_at IS NULL
       LEFT JOIN media_assets avatar ON avatar.id = up.avatar_media_id AND avatar.deleted_at IS NULL
       WHERE s.deleted_at IS NULL AND s.expires_at > now() AND s.moderation_status = 'safe'
         AND NOT EXISTS (
           SELECT 1 FROM user_blocks b
           WHERE (b.blocker_id = $1::uuid AND b.blocked_id = s.author_id)
              OR (b.blocker_id = s.author_id AND b.blocked_id = $1::uuid)
         )
         AND NOT EXISTS (
           SELECT 1 FROM user_mutes mute
           WHERE mute.muter_id = $1::uuid AND mute.muted_id = s.author_id
             AND (mute.expires_at IS NULL OR mute.expires_at > now())
         )
         AND (
           s.author_id = $1::uuid
           OR (
             s.visibility <> 'private'
             AND (
               COALESCE(settings.profile_visibility, 'public'::visibility) = 'public'
               OR EXISTS (
                 SELECT 1 FROM follows f
                 WHERE f.follower_id = $1::uuid AND f.followed_id = s.author_id
               )
             )
           )
         )
       ORDER BY s.created_at ASC, sm.position ASC`, [req.user.id]
    )
    logStage(req, 'story_feed_query_completed', {
      storyCount: rows.length,
      authors: [...new Set(rows.map((row) => row.author_id))],
      publicStoryCount: rows.filter((row) => !row.is_private).length,
      followedAuthorStoryCount: rows.filter((row) => row.viewer_follows).length,
    })
    res.json(rows)
  } catch (error) {
    logFailure(req, 'story_feed_query_failed', error)
    next(error)
  }
}

export async function createStory(req, res, next) {
  const file = req.file
  if (!file) return res.status(400).json({ message: 'Story image or video is required.' })
  const caption = String(req.body.caption || '').trim().slice(0, 1000)
  let visibility = ['public', 'followers', 'friends', 'private'].includes(req.body.visibility) ? req.body.visibility : null
  if (!visibility) {
    const { rows: settings } = await pool.query(
      `SELECT COALESCE(profile_visibility, 'public'::visibility) AS profile_visibility
       FROM user_settings WHERE user_id = $1::uuid`, [req.user.id]
    )
    visibility = (settings[0]?.profile_visibility || 'public') === 'public' ? 'public' : 'followers'
  }
  logStage(req, 'story_moderation_started', { mimeType: file.mimetype, byteSize: file.size })
  const [decisions, captionDecision] = await Promise.all([moderateUploadedMedia([file]), moderate({ text: caption, userId: req.user.id, contentType: 'story' })]).catch(async (error) => {
    await fs.unlink(file.path).catch(() => {})
    logFailure(req, 'story_moderation_failed', error)
    throw error
  })
  const decision = decisions[0]
  if (captionDecision.status === 'rejected') {
    await fs.unlink(file.path).catch(() => {})
    return res.status(422).json({ message: 'Story caption rejected', reason: captionDecision.reason })
  }
  if (!decision?.available) {
    await fs.unlink(file.path).catch(() => {})
    logStage(req, 'story_moderation_unavailable', { reason: decision?.reason })
    return res.status(503).json({
      message: 'Media safety review is temporarily unavailable. Please try again shortly.',
      code: decision?.reason || 'media_moderation_unavailable',
    })
  }
  if (!decision.safe) {
    await fs.unlink(file.path).catch(() => {})
    return res.status(422).json({ message: `${kindFor(file.mimetype) === 'video' ? 'Video' : 'Image'} rejected`, reason: decision.reason, categories: decision.categories })
  }
  logStage(req, 'story_moderation_completed', { safe: true, confidence: decision.confidence })
  let storedMedia
  try {
    logStage(req, 'story_storage_upload_started', { storageConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) })
    storedMedia = await uploadPublicMedia(file, `stories/${req.user.id}`)
    logStage(req, 'story_storage_upload_completed', { bucket: storedMedia.bucket, objectPath: storedMedia.objectPath })
  } catch (error) {
    await fs.unlink(file.path).catch(() => {})
    logFailure(req, 'story_storage_upload_failed', error)
    if (error.code === 'OBJECT_STORAGE_NOT_CONFIGURED') {
      return res.status(503).json({
        message: 'Story storage is not configured on the server. Please contact support.',
        code: error.code,
      })
    }
    if (error.code === 'OBJECT_STORAGE_UPLOAD_FAILED') {
      return res.status(502).json({
        message: 'Story media could not be saved. Please try again shortly.',
        code: error.code,
      })
    }
    return next(error)
  }
  const client = await pool.connect()
  try {
    logStage(req, 'story_database_insert_started')
    await client.query('BEGIN')
    const story = (await client.query(
      `INSERT INTO stories (author_id, caption, visibility, moderation_status)
       VALUES ($1::uuid,$2,$3::visibility,'safe') RETURNING *`,
      [req.user.id, caption, visibility]
    )).rows[0]
    const url = storedMedia.publicUrl
    const media = (await client.query(
      `INSERT INTO media_assets (owner_id, kind, storage_bucket, storage_path, mime_type, byte_size, moderation_status)
       VALUES ($1::uuid,$2::media_kind,$3,$4,$5,$6,'safe') RETURNING id`,
      [req.user.id, kindFor(file.mimetype), storedMedia.bucket, url, file.mimetype, file.size]
    )).rows[0]
    await client.query(`INSERT INTO story_media (story_id, media_id, position) VALUES ($1,$2,0)`, [story.id, media.id])
    await client.query('COMMIT')
    logStage(req, 'story_database_insert_completed', { storyId: story.id, mediaId: media.id })
    logStage(req, 'story_response_returned', { status: 201, storyId: story.id })
    res.status(201).json({ ...story, media_type: kindFor(file.mimetype), media_url: url })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    await deletePublicMedia(storedMedia)
    logFailure(req, 'story_database_insert_failed', error)
    next(error)
  } finally { client.release() }
}

export async function markStoryViewed(req, res, next) {
  try {
    await pool.query(`INSERT INTO story_views (story_id, viewer_id) VALUES ($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`, [req.params.storyId, req.user.id])
    res.json({ viewed: true })
  } catch (error) { next(error) }
}

export async function toggleStoryLike(req, res, next) {
  try {
    const removed = await pool.query(`DELETE FROM story_reactions WHERE story_id = $1::uuid AND user_id = $2::uuid RETURNING story_id`, [req.params.storyId, req.user.id])
    if (!removed.rowCount) await pool.query(`INSERT INTO story_reactions (story_id, user_id) VALUES ($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`, [req.params.storyId, req.user.id])
    res.json({ liked: !removed.rowCount })
  } catch (error) { next(error) }
}

export async function deleteStory(req, res, next) {
  try {
    const result = await deleteStoryAndMedia(req.params.storyId, req.user.id)
    if (!result.found) return res.status(404).json({ message: 'Story not found or you do not own it.' })
    logStage(req, 'story_deleted', { storyId: req.params.storyId, storageCleanupPending: result.storageCleanupPending })
    res.json({ message: 'Story deleted.', storyId: req.params.storyId, storageCleanupPending: result.storageCleanupPending })
  } catch (error) {
    logFailure(req, 'story_delete_failed', error, { storyId: req.params.storyId })
    next(error)
  }
}
