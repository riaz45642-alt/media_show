import { pool } from '../config/db.js'
import { deletePublicMedia, objectPathFromPublicUrl } from './objectStorageService.js'

export async function deleteStoryAndMedia(storyId, ownerId = null) {
  const client = await pool.connect()
  let story
  let media
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `SELECT id, author_id FROM stories
       WHERE id = $1::uuid AND ($2::uuid IS NULL OR author_id = $2::uuid)
       FOR UPDATE`, [storyId, ownerId]
    )
    story = result.rows[0]
    if (!story) { await client.query('ROLLBACK'); return { found: false } }
    media = (await client.query(
      `SELECT ma.id, ma.storage_bucket, ma.storage_path
       FROM story_media sm JOIN media_assets ma ON ma.id = sm.media_id
       WHERE sm.story_id = $1::uuid`, [storyId]
    )).rows
    await client.query(`UPDATE stories SET deleted_at = COALESCE(deleted_at, now()) WHERE id = $1::uuid`, [storyId])
    if (media.length) await client.query(`UPDATE media_assets SET deleted_at = COALESCE(deleted_at, now()) WHERE id = ANY($1::uuid[])`, [media.map((item) => item.id)])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }

  let storageCleanupPending = false
  for (const item of media) {
    const objectPath = objectPathFromPublicUrl(item.storage_path, item.storage_bucket)
    if (!objectPath) { storageCleanupPending = true; continue }
    try { await deletePublicMedia({ bucket: item.storage_bucket, objectPath }) }
    catch (error) {
      storageCleanupPending = true
      console.error(JSON.stringify({ level: 'error', event: 'story_storage_delete_failed', storyId, mediaId: item.id, code: error.code, message: error.message }))
    }
  }

  if (!storageCleanupPending) {
    const purge = await pool.connect()
    try {
      await purge.query('BEGIN')
      await purge.query(`DELETE FROM stories WHERE id = $1::uuid`, [storyId])
      if (media.length) await purge.query(`DELETE FROM media_assets WHERE id = ANY($1::uuid[])`, [media.map((item) => item.id)])
      await purge.query('COMMIT')
    } catch (error) {
      await purge.query('ROLLBACK').catch(() => {})
      throw error
    } finally { purge.release() }
  }
  return { found: true, storageCleanupPending }
}

export async function cleanupExpiredStories() {
  const { rows } = await pool.query(
    `SELECT id FROM stories WHERE expires_at <= now() OR deleted_at IS NOT NULL ORDER BY expires_at LIMIT 100`
  )
  let purged = 0
  for (const row of rows) {
    const result = await deleteStoryAndMedia(row.id)
    if (result.found && !result.storageCleanupPending) purged += 1
  }
  if (rows.length) console.info(JSON.stringify({ level: 'info', event: 'expired_story_cleanup_completed', candidates: rows.length, purged }))
  return { candidates: rows.length, purged }
}

export function startStoryCleanupJob() {
  cleanupExpiredStories().catch((error) => console.error(JSON.stringify({ level: 'error', event: 'expired_story_cleanup_failed', message: error.message, stack: error.stack })))
  const timer = setInterval(() => cleanupExpiredStories().catch((error) => console.error(JSON.stringify({ level: 'error', event: 'expired_story_cleanup_failed', message: error.message, stack: error.stack }))), 60 * 60 * 1000)
  timer.unref?.()
  return timer
}
