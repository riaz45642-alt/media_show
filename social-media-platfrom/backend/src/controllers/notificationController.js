import { pool } from '../config/db.js'

const KINDS_BY_CATEGORY = {
  likes: ['like', 'reaction'], comments: ['comment'], follows: ['follow', 'friend_request'],
  messages: ['message'], calls: ['incoming_call', 'missed_call', 'call_declined'], mentions: ['mention'],
  stories: ['story'], system: ['moderation', 'appeal', 'report', 'verification', 'security', 'system'],
}

// GET /api/notifications?category=moderation&unread=true&search=badge
export async function listNotifications(req, res, next) {
  try {
    const { category, unread, search } = req.query
    const params = [req.user.id]
    let where = 'WHERE n.recipient_id = $1'

    if (category && category !== 'all') {
      const kinds = KINDS_BY_CATEGORY[category]
      if (!kinds) return res.status(400).json({ message: 'Unknown notification category' })
      params.push(kinds)
      where += ` AND n.kind::text = ANY($${params.length}::text[])`
    }
    if (unread === 'true') {
      where += ' AND n.read_at IS NULL'
    }
    if (search) {
      params.push(`%${search}%`)
      where += ` AND (n.title ILIKE $${params.length} OR n.body ILIKE $${params.length})`
    }

    const { rows } = await pool.query(
      `SELECT n.*, actor_profile.display_name AS actor_name, actor_avatar.storage_path AS actor_avatar_url,
              fr.status::text AS follow_request_status,
              CASE WHEN n.kind::text = 'friend_request'
                   THEN COALESCE(fr.status::text = 'accepted', (n.data->>'accepted')::boolean, false)
                   ELSE false END AS accepted
       FROM notifications n
       LEFT JOIN user_profiles actor_profile ON actor_profile.user_id = n.actor_id
       LEFT JOIN media_assets actor_avatar ON actor_avatar.id = actor_profile.avatar_media_id AND actor_avatar.deleted_at IS NULL
       LEFT JOIN friend_requests fr ON n.entity_type = 'follow_request' AND fr.id = n.entity_id
       ${where} ORDER BY n.created_at DESC LIMIT 100`,
      params
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

// POST /api/notifications/:id/read
export async function markRead(req, res, next) {
  try {
    const { rows } = await pool.query(
      `UPDATE notifications SET read_at = now() WHERE id = $1 AND recipient_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'Notification not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

// POST /api/notifications/read-all
export async function markAllRead(req, res, next) {
  try {
    await pool.query(`UPDATE notifications SET read_at = now() WHERE recipient_id = $1 AND read_at IS NULL`, [req.user.id])
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/notifications/:id - dismiss a notification owned by the user.
export async function dismissNotification(req, res, next) {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND recipient_id = $2`,
      [req.params.id, req.user.id]
    )
    if (!rowCount) return res.status(404).json({ message: 'Notification not found' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

// GET /api/notifications/preferences
export async function getPreferences(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT notification_preferences FROM user_settings WHERE user_id = $1`, [req.user.id])
    res.json(rows[0]?.notification_preferences || {})
  } catch (err) {
    next(err)
  }
}

// PUT /api/notifications/preferences  body: { <category>: boolean, ... }
export async function updatePreferences(req, res, next) {
  try {
    const { rows } = await pool.query(
      `UPDATE user_settings SET notification_preferences = notification_preferences || $1::jsonb
       WHERE user_id = $2 RETURNING notification_preferences`,
      [JSON.stringify(req.body || {}), req.user.id]
    )
    res.json(rows[0]?.notification_preferences || {})
  } catch (err) {
    next(err)
  }
}
