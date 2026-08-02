import { pool } from '../config/db.js'
import { deletePublicMedia, objectPathFromPublicUrl } from './objectStorageService.js'

async function transferOwnedGroups(client, userId) {
  const { rows: groups } = await client.query(`SELECT id FROM groups WHERE owner_id = $1::uuid FOR UPDATE`, [userId])
  for (const group of groups) {
    const { rows: successors } = await client.query(
      `SELECT user_id FROM group_members WHERE group_id = $1::uuid AND user_id <> $2::uuid
       ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, joined_at LIMIT 1`,
      [group.id, userId]
    )
    if (!successors[0]) {
      await client.query(`DELETE FROM groups WHERE id = $1::uuid`, [group.id])
      continue
    }
    await client.query(`UPDATE groups SET owner_id = $1::uuid, updated_at = now() WHERE id = $2::uuid`, [successors[0].user_id, group.id])
    await client.query(`UPDATE group_members SET role = 'owner'::group_role WHERE group_id = $1::uuid AND user_id = $2::uuid`, [group.id, successors[0].user_id])
  }
}

async function transferOwnedConversations(client, userId) {
  const { rows: conversations } = await client.query(`SELECT id FROM conversations WHERE created_by = $1::uuid FOR UPDATE`, [userId])
  for (const conversation of conversations) {
    const { rows: successors } = await client.query(
      `SELECT user_id FROM conversation_members
       WHERE conversation_id = $1::uuid AND user_id <> $2::uuid
       ORDER BY joined_at LIMIT 1`, [conversation.id, userId]
    )
    if (successors[0]) {
      await client.query(`UPDATE conversations SET created_by = $1::uuid, updated_at = now() WHERE id = $2::uuid`, [successors[0].user_id, conversation.id])
    } else {
      await client.query(`DELETE FROM conversations WHERE id = $1::uuid`, [conversation.id])
    }
  }
}

export async function permanentlyDeleteAccount(userId) {
  const client = await pool.connect()
  let media
  try {
    await client.query('BEGIN')
    const locked = await client.query(`SELECT id FROM users WHERE id = $1::uuid FOR UPDATE`, [userId])
    if (!locked.rows[0]) {
      await client.query('ROLLBACK')
      return { found: false, storageCleanupFailures: [] }
    }

    media = (await client.query(
      `SELECT id, storage_bucket, storage_path FROM media_assets WHERE owner_id = $1::uuid`, [userId]
    )).rows
    const mediaIds = media.map((item) => item.id)

    // Remove the user's authored messages rather than retaining anonymized
    // copies through messages.sender_id ON DELETE SET NULL.
    await client.query(`DELETE FROM messages WHERE sender_id = $1::uuid`, [userId])
    await transferOwnedGroups(client, userId)
    await transferOwnedConversations(client, userId)

    if (mediaIds.length) {
      await client.query(`DELETE FROM post_media WHERE media_id = ANY($1::uuid[])`, [mediaIds])
      await client.query(`DELETE FROM story_media WHERE media_id = ANY($1::uuid[])`, [mediaIds])
      await client.query(`DELETE FROM message_media WHERE media_id = ANY($1::uuid[])`, [mediaIds])
      await client.query(`DELETE FROM media_assets WHERE id = ANY($1::uuid[])`, [mediaIds])
    }

    // These relationships intentionally use SET NULL, so explicitly remove
    // privacy-sensitive records that belong to the account.
    await client.query(`DELETE FROM notifications WHERE actor_id = $1::uuid OR recipient_id = $1::uuid`, [userId])
    await client.query(`DELETE FROM activity_logs WHERE user_id = $1::uuid`, [userId])
    await client.query(`DELETE FROM call_logs WHERE user_id = $1::uuid`, [userId])
    await client.query(`DELETE FROM reports WHERE reporter_id = $1::uuid OR (target_type = 'user' AND target_id = $1::uuid)`, [userId])
    await client.query(`DELETE FROM moderation_cases WHERE target_type = 'user' AND target_id = $1::uuid`, [userId])

    const deleted = await client.query(`DELETE FROM users WHERE id = $1::uuid RETURNING id`, [userId])
    if (!deleted.rows[0]) throw new Error('Account disappeared during deletion')
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }

  const storageCleanupFailures = []
  for (const item of media) {
    const objectPath = objectPathFromPublicUrl(item.storage_path, item.storage_bucket)
    if (!objectPath) continue // Local/legacy uploads are not Supabase objects.
    try {
      await deletePublicMedia({ bucket: item.storage_bucket, objectPath })
    } catch (error) {
      storageCleanupFailures.push({ mediaId: item.id, code: error.code || 'STORAGE_DELETE_FAILED' })
      console.error(JSON.stringify({
        level: 'error', event: 'account_storage_delete_failed', userId,
        mediaId: item.id, code: error.code, message: error.message,
      }))
    }
  }
  return { found: true, storageCleanupFailures }
}
