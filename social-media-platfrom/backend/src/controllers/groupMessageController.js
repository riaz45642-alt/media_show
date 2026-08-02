import { pool } from '../config/db.js'
import { createNotification } from '../services/notificationService.js'
import { emitToCurrentGroupMembers } from '../services/groupRealtimeService.js'

async function getGroupConversation(groupId) {
  const { rows } = await pool.query(`SELECT id AS group_id, conversation_id FROM groups WHERE id = $1 AND deleted_at IS NULL`, [groupId])
  return rows[0] || null
}

export async function requireGroupMember(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`, [req.params.groupId, req.user.id])
    if (!rows.length) return res.status(403).json({ message: 'You are not a member of this group' })
    req.groupRole = rows[0].role
    next()
  } catch (err) {
    next(err)
  }
}

export async function listMessages(req, res, next) {
  try {
    const group = await getGroupConversation(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    const before = req.query.before || null

    const { rows } = await pool.query(
      `SELECT m.*, up.display_name AS sender_name, avatar.storage_path AS sender_avatar_url,
              gmm.file_url, gmm.file_name, gmm.file_type,
              EXISTS (SELECT 1 FROM group_pinned_messages pm WHERE pm.message_id = m.id) AS is_pinned
       FROM messages m
       JOIN user_profiles up ON up.user_id = m.sender_id
       LEFT JOIN media_assets avatar ON avatar.id = up.avatar_media_id AND avatar.deleted_at IS NULL
       LEFT JOIN group_message_media gmm ON gmm.message_id = m.id
       WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
         AND ($2::timestamptz IS NULL OR m.sent_at < $2)
       ORDER BY m.sent_at DESC LIMIT 50`,
      [group.conversation_id, before]
    )
    res.json(rows.reverse())
  } catch (err) {
    next(err)
  }
}

export async function sendMessage(req, res, next) {
  try {
    const group = await getGroupConversation(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    const { body, replyToId, fileUrl, fileName, fileType } = req.body
    const kind = fileType && ['image', 'video'].includes(fileType) ? fileType : (fileUrl ? 'shared' : 'text')
    if (!body && !fileUrl) return res.status(400).json({ message: 'Message needs text or an attachment' })

    const { rows } = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, reply_to_id, kind, body, moderation_status)
       VALUES ($1,$2,$3,$4,$5,'safe') RETURNING *`,
      [group.conversation_id, req.user.id, replyToId || null, kind, body || null]
    )
    const message = rows[0]

    if (fileUrl) {
      await pool.query(
        `INSERT INTO group_message_media (message_id, file_url, file_name, file_type) VALUES ($1,$2,$3,$4)`,
        [message.id, fileUrl, fileName || null, fileType || 'document']
      )
    }
    await pool.query(`UPDATE conversations SET last_message_at = now(), updated_at = now() WHERE id = $1`, [group.conversation_id])

    const { rows: senderRows } = await pool.query(`SELECT display_name FROM user_profiles WHERE user_id = $1`, [req.user.id])
    const payload = { ...message, sender_name: senderRows[0]?.display_name, file_url: fileUrl || null, file_name: fileName || null, file_type: fileType || null }
    await emitToCurrentGroupMembers(req.params.groupId, 'group:message', payload)

    const { rows: groupRows } = await pool.query(`SELECT name FROM groups WHERE id = $1`, [req.params.groupId])
    const { rows: members } = await pool.query(`SELECT user_id FROM group_members WHERE group_id = $1 AND user_id <> $2`, [req.params.groupId, req.user.id])
    await Promise.all(members.map(({ user_id }) => createNotification({
      userId: user_id, actorId: req.user.id, category: 'messages', type: 'message',
      text: `${senderRows[0]?.display_name || 'A member'} in ${groupRows[0]?.name || 'a group'}: ${(body || 'Shared media').slice(0, 100)}`,
      link: `/groups/${req.params.groupId}`, entityType: 'group', entityId: req.params.groupId,
      data: { groupId: req.params.groupId, groupName: groupRows[0]?.name, messageId: message.id },
    })))

    res.status(201).json(payload)
  } catch (err) {
    next(err)
  }
}

export async function deleteMessage(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT sender_id FROM messages WHERE id = $1`, [req.params.messageId])
    if (!rows.length) return res.status(404).json({ message: 'Message not found' })
    if (rows[0].sender_id !== req.user.id && !['owner', 'admin'].includes(req.groupRole)) {
      return res.status(403).json({ message: 'You can only delete your own messages' })
    }
    await pool.query(`UPDATE messages SET deleted_at = now(), body = NULL WHERE id = $1`, [req.params.messageId])
    await emitToCurrentGroupMembers(req.params.groupId, 'group:message-deleted', { messageId: req.params.messageId })
    res.json({ message: 'Message deleted' })
  } catch (err) {
    next(err)
  }
}

export async function searchMessages(req, res, next) {
  try {
    const group = await getGroupConversation(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    const q = req.query.q || ''
    const { rows } = await pool.query(
      `SELECT m.*, up.display_name AS sender_name FROM messages m
       JOIN user_profiles up ON up.user_id = m.sender_id
       WHERE m.conversation_id = $1 AND m.deleted_at IS NULL AND m.body ILIKE $2
       ORDER BY m.sent_at DESC LIMIT 50`,
      [group.conversation_id, `%${q}%`]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function pinMessage(req, res, next) {
  try {
    if (!['owner', 'admin'].includes(req.groupRole)) return res.status(403).json({ message: 'Only admins can pin messages' })
    await pool.query(
      `INSERT INTO group_pinned_messages (group_id, message_id, pinned_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [req.params.groupId, req.params.messageId, req.user.id]
    )
    await emitToCurrentGroupMembers(req.params.groupId, 'group:message-pinned', { messageId: req.params.messageId })
    res.json({ message: 'Message pinned' })
  } catch (err) {
    next(err)
  }
}

export async function unpinMessage(req, res, next) {
  try {
    if (!['owner', 'admin'].includes(req.groupRole)) return res.status(403).json({ message: 'Only admins can unpin messages' })
    await pool.query(`DELETE FROM group_pinned_messages WHERE group_id = $1 AND message_id = $2`, [req.params.groupId, req.params.messageId])
    await emitToCurrentGroupMembers(req.params.groupId, 'group:message-unpinned', { messageId: req.params.messageId })
    res.json({ message: 'Message unpinned' })
  } catch (err) {
    next(err)
  }
}

export async function listPinned(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, up.display_name AS sender_name FROM group_pinned_messages pm
       JOIN messages m ON m.id = pm.message_id
       JOIN user_profiles up ON up.user_id = m.sender_id
       WHERE pm.group_id = $1 ORDER BY pm.pinned_at DESC`,
      [req.params.groupId]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function markSeen(req, res, next) {
  try {
    const group = await getGroupConversation(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    await pool.query(
      `UPDATE conversation_members SET last_read_at = now() WHERE conversation_id = $1 AND user_id = $2`,
      [group.conversation_id, req.user.id]
    )
    if (req.body?.messageId) {
      await pool.query(
        `INSERT INTO group_message_receipts (message_id, user_id) VALUES ($1,$2)
         ON CONFLICT (message_id, user_id) DO UPDATE SET seen_at = now()`,
        [req.body.messageId, req.user.id]
      )
    }
    res.json({ message: 'Marked as seen' })
  } catch (err) {
    next(err)
  }
}
