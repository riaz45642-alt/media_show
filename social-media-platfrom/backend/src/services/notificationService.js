import { pool } from '../config/db.js'

// Internal helper: insert a notification row for a user, respecting their
// per-category preferences. Never throws — a failed notification should
// never break the primary action (moderation decision, appeal, etc.).
export async function createNotification({ userId, actorId = null, category, type, text, link, entityType = null, entityId = null, data = {} }) {
  if (!userId) return null
  try {
    const { rows } = await pool.query('SELECT notification_preferences FROM user_settings WHERE user_id = $1', [userId])
    const prefs = rows[0]?.notification_preferences
    if (prefs && prefs[category] === false) return null

    const { rows: inserted } = await pool.query(
      `INSERT INTO notifications (recipient_id, actor_id, kind, entity_type, entity_id, title, body, link, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`,
      [userId, actorId, type || category, entityType, entityId, text.slice(0, 160), text, link || null, JSON.stringify(data)]
    )
    return inserted[0]
  } catch (err) {
    console.error('createNotification failed:', err.message)
    return null
  }
}
