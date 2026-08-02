import { pool } from '../config/db.js'
import { getIO } from '../sockets/index.js'

const PREFERENCE_KEY = {
  followers: 'follows', moderation: 'system', appeals: 'system', reports: 'system', security: 'system',
}

// Internal helper: insert a notification row for a user, respecting their
// per-category preferences. Never throws — a failed notification should
// never break the primary action (moderation decision, appeal, etc.).
export async function createNotification({ userId, actorId = null, category, type, text, link, entityType = null, entityId = null, data = {} }) {
  if (!userId) return null
  try {
    const { rows } = await pool.query(
      `SELECT s.notification_preferences FROM users u
       JOIN user_settings s ON s.user_id = u.id
       WHERE u.id = $1::uuid AND u.status = 'active' AND u.deleted_at IS NULL`, [userId]
    )
    if (!rows[0]) return null
    const prefs = rows[0]?.notification_preferences
    const preferenceKey = PREFERENCE_KEY[category] || category
    if (prefs && (prefs.enabled === false || prefs[preferenceKey] === false)) return null

    const { rows: inserted } = await pool.query(
      `INSERT INTO notifications (recipient_id, actor_id, kind, entity_type, entity_id, title, body, link, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`,
      [userId, actorId, type || category, entityType, entityId, text.slice(0, 160), text, link || null, JSON.stringify(data)]
    )
    const notification = inserted[0]
    const recipientRoom = `user:${notification.recipient_id}`
    try {
      getIO().to(recipientRoom).emit('notification:new', notification)
      console.info(JSON.stringify({
        level: 'info', event: 'notification_targeted', notificationId: notification.id,
        recipientId: notification.recipient_id, actorId: notification.actor_id,
        kind: notification.kind, room: recipientRoom,
      }))
    } catch {
      // Socket.IO is not available during migrations and isolated service tests.
    }
    return notification
  } catch (err) {
    console.error('createNotification failed:', { message: err.message, code: err.code, stack: err.stack })
    return null
  }
}
