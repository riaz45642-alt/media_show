import { pool } from '../config/db.js'
import { moderate } from '../services/moderationService.js'
import { createNotification } from '../services/notificationService.js'
import { getIO } from '../sockets/index.js'

async function canMessage(requesterId, targetId, client = pool) {
  const { rows } = await client.query(
    `SELECT s.profile_visibility,
            EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND followed_id = $2) AS approved,
            EXISTS (SELECT 1 FROM user_blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)) AS blocked
     FROM users u
     JOIN user_settings s ON s.user_id = u.id
     WHERE u.id = $2 AND u.status = 'active' AND u.deleted_at IS NULL`,
    [requesterId, targetId]
  )
  const target = rows[0]
  if (!target || target.blocked) return false
  return target.profile_visibility === 'public' || target.approved
}

export async function searchChatUsers(req, res, next) {
  try {
    const query = String(req.query.q || req.query.search || '').trim()
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 20))
    const { rows } = await pool.query(
      `SELECT u.id, p.username, p.display_name AS name, avatar.storage_path AS avatar_url,
              EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followed_id = u.id) AS is_following,
              CASE WHEN s.profile_visibility = 'public' THEN true
                   ELSE EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followed_id = u.id)
              END AS can_message
       FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       JOIN user_settings s ON s.user_id = u.id
       LEFT JOIN media_assets avatar ON avatar.id = p.avatar_media_id AND avatar.deleted_at IS NULL
       WHERE u.id <> $1 AND u.status = 'active' AND u.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $1))
         AND ($2 = '' OR p.username ILIKE '%' || $2 || '%' OR p.display_name ILIKE '%' || $2 || '%')
       ORDER BY is_following DESC,
                CASE WHEN lower(p.username) = lower($2) THEN 0 WHEN p.username ILIKE $2 || '%' THEN 1 WHEN p.display_name ILIKE $2 || '%' THEN 2 ELSE 3 END,
                p.display_name
       LIMIT $3`,
      [req.user.id, query, limit]
    )
    res.json(rows)
  } catch (error) { next(error) }
}

export async function createConversation(req, res, next) {
  const targetId = req.body.userId || req.body.user_id
  if (!targetId || targetId === req.user.id) return res.status(400).json({ message: 'Choose another user' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (!(await canMessage(req.user.id, targetId, client))) {
      await client.query('ROLLBACK')
      return res.status(403).json({ message: 'This account only accepts messages from approved followers.' })
    }
    const pair = [req.user.id, targetId].sort()
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`direct:${pair[0]}:${pair[1]}`])
    let conversation = (await client.query(
      `SELECT c.* FROM direct_conversation_pairs d JOIN conversations c ON c.id = d.conversation_id
       WHERE d.user_low = $1 AND d.user_high = $2`, pair
    )).rows[0]
    if (!conversation) {
      conversation = (await client.query(
        `SELECT c.* FROM conversations c
         JOIN conversation_members mine ON mine.conversation_id = c.id AND mine.user_id = $1 AND mine.left_at IS NULL
         JOIN conversation_members theirs ON theirs.conversation_id = c.id AND theirs.user_id = $2 AND theirs.left_at IS NULL
         WHERE c.kind = 'direct'
           AND (SELECT count(*) FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.left_at IS NULL) = 2
         ORDER BY c.created_at LIMIT 1`,
        [req.user.id, targetId]
      )).rows[0]
    }
    if (!conversation) {
      conversation = (await client.query(
        `INSERT INTO conversations (kind, created_by) VALUES ('direct', $1) RETURNING *`, [req.user.id]
      )).rows[0]
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
        [conversation.id, req.user.id, targetId]
      )
    }
    await client.query(
      `INSERT INTO direct_conversation_pairs (user_low, user_high, conversation_id) VALUES ($1,$2,$3)
       ON CONFLICT (user_low, user_high) DO UPDATE SET conversation_id = direct_conversation_pairs.conversation_id`,
      [pair[0], pair[1], conversation.id]
    )
    await client.query('COMMIT')
    res.status(200).json({ conversation })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    next(error)
  } finally { client.release() }
}

export async function listConversations(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.created_at, c.last_message_at, me.pinned_at, me.archived_at,
              other.user_id AS participant_id, p.display_name AS participant_name, p.username,
              avatar.storage_path AS avatar_url,
              last_message.id AS last_message_id, last_message.body AS last_message_body,
              last_message.kind AS last_message_kind, last_message.sender_id AS last_message_sender_id,
              last_message.sent_at AS last_message_sent_at,
              COALESCE(unread.count, 0)::int AS unread_count
       FROM conversation_members me
       JOIN conversations c ON c.id = me.conversation_id AND c.kind = 'direct'
       JOIN conversation_members other ON other.conversation_id = c.id AND other.user_id <> $1 AND other.left_at IS NULL
       JOIN user_profiles p ON p.user_id = other.user_id
       LEFT JOIN media_assets avatar ON avatar.id = p.avatar_media_id AND avatar.deleted_at IS NULL
       LEFT JOIN LATERAL (
         SELECT m.id, m.body, m.kind, m.sender_id, m.sent_at FROM messages m
         WHERE m.conversation_id = c.id AND m.deleted_at IS NULL AND m.moderation_status = 'safe'
         ORDER BY m.sent_at DESC LIMIT 1
       ) last_message ON true
       LEFT JOIN LATERAL (
         SELECT count(*) FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
           AND m.sender_id <> $1 AND m.moderation_status = 'safe' AND m.sent_at > COALESCE(me.last_read_at, me.joined_at)
       ) unread ON true
       WHERE me.user_id = $1 AND me.left_at IS NULL
       ORDER BY me.pinned_at DESC NULLS LAST, COALESCE(c.last_message_at, c.created_at) DESC`,
      [req.user.id]
    )
    res.json(rows)
  } catch (error) { next(error) }
}

export async function listDirectMessages(req, res, next) {
  try {
    const before = req.query.before || null
    const access = await pool.query(
      `SELECT 1 FROM conversation_members cm JOIN conversations c ON c.id = cm.conversation_id AND c.kind = 'direct'
       WHERE cm.conversation_id = $1 AND cm.user_id = $2 AND cm.left_at IS NULL`,
      [req.params.conversationId, req.user.id]
    )
    if (!access.rowCount) return res.status(403).json({ message: 'Conversation access denied' })
    const { rows } = await pool.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.reply_to_id, m.kind, m.body, m.sent_at,
              CASE WHEN other.last_read_at >= m.sent_at THEN 'seen' ELSE 'delivered' END AS status
       FROM messages m
       JOIN conversation_members mine ON mine.conversation_id = m.conversation_id AND mine.user_id = $2 AND mine.left_at IS NULL
       LEFT JOIN conversation_members other ON other.conversation_id = m.conversation_id AND other.user_id <> $2 AND other.left_at IS NULL
       WHERE m.conversation_id = $1 AND m.deleted_at IS NULL AND m.moderation_status = 'safe'
         AND ($3::timestamptz IS NULL OR m.sent_at < $3)
       ORDER BY m.sent_at DESC LIMIT 50`,
      [req.params.conversationId, req.user.id, before]
    )
    res.json(rows.reverse())
  } catch (error) { next(error) }
}

export async function sendDirectMessage(req, res, next) {
  try {
    const text = String(req.body.text || req.body.body || '').trim()
    if (!text) return res.status(400).json({ message: 'Message text is required' })
    const membership = await pool.query(
      `SELECT other.user_id AS recipient_id FROM conversation_members mine
       JOIN conversations c ON c.id = mine.conversation_id AND c.kind = 'direct'
       JOIN conversation_members other ON other.conversation_id = c.id AND other.user_id <> $2 AND other.left_at IS NULL
       WHERE mine.conversation_id = $1 AND mine.user_id = $2 AND mine.left_at IS NULL`,
      [req.params.conversationId, req.user.id]
    )
    if (!membership.rows[0]) return res.status(403).json({ message: 'Conversation access denied' })
    if (!(await canMessage(req.user.id, membership.rows[0].recipient_id))) {
      return res.status(403).json({ message: 'This account only accepts messages from approved followers.' })
    }
    const result = await moderate({ text, userId: req.user.id, contentType: 'message' })
    if (result.status === 'rejected') return res.status(422).json({ message: 'Message rejected by moderation', reason: result.reason })
    const client = await pool.connect()
    let message
    try {
      await client.query('BEGIN')
      message = (await client.query(
        `INSERT INTO messages (conversation_id, sender_id, reply_to_id, kind, body, moderation_status, moderation_reason, risk_score)
         VALUES ($1,$2,$3,'text',$4,$5::moderation_state,$6,$7) RETURNING *`,
        [req.params.conversationId, req.user.id, req.body.replyToId || null, text, result.status, result.reason, result.riskScore]
      )).rows[0]
      await client.query(`UPDATE conversations SET last_message_at = now(), updated_at = now() WHERE id = $1`, [req.params.conversationId])
      await client.query(`UPDATE conversation_members SET last_read_at = now() WHERE conversation_id = $1 AND user_id = $2`, [req.params.conversationId, req.user.id])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally { client.release() }
    await createNotification({
      userId: membership.rows[0].recipient_id, actorId: req.user.id, category: 'messages', type: 'message',
      text: text.length > 80 ? `${text.slice(0, 77)}...` : text, link: `/messages/${req.params.conversationId}`,
      entityType: 'conversation', entityId: req.params.conversationId,
    })
    const payload = { ...message, status: 'delivered' }
    getIO().to(`user:${membership.rows[0].recipient_id}`).emit('chat:message', payload)
    getIO().to(`user:${membership.rows[0].recipient_id}`).emit('message:new', payload)
    getIO().to(`user:${membership.rows[0].recipient_id}`).emit('conversation:update', { conversationId: req.params.conversationId, message: payload })
    getIO().to(`user:${req.user.id}`).emit('chat:message-sent', payload)
    res.status(201).json(payload)
  } catch (error) { next(error) }
}

export async function markConversationRead(req, res, next) {
  try {
    const { rows, rowCount } = await pool.query(
      `UPDATE conversation_members SET last_read_at = now() WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
       RETURNING last_read_at`,
      [req.params.conversationId, req.user.id]
    )
    if (!rowCount) return res.status(403).json({ message: 'Conversation access denied' })
    const peers = await pool.query(`SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id <> $2 AND left_at IS NULL`, [req.params.conversationId, req.user.id])
    for (const peer of peers.rows) getIO().to(`user:${peer.user_id}`).emit('message:read', { conversationId: req.params.conversationId, userId: req.user.id, readAt: rows[0].last_read_at })
    res.json({ ok: true })
  } catch (error) { next(error) }
}
