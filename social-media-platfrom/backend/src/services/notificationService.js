import { pool } from '../config/db.js'

// Internal helper: insert a notification row for a user, respecting their
// per-category preferences. Never throws — a failed notification should
// never break the primary action (moderation decision, appeal, etc.).
export async function createNotification({ userId, category, type, text, link }) {
  if (!userId) return null
  try {
    const { rows } = await pool.query('SELECT notification_prefs FROM users WHERE id = $1', [userId])
    const prefs = rows[0]?.notification_prefs
    if (prefs && prefs[category] === false) return null

    const { rows: inserted } = await pool.query(
      `INSERT INTO notifications (user_id, category, type, text, link)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userId, category, type, text, link || null]
    )
    return inserted[0]
  } catch (err) {
    console.error('createNotification failed:', err.message)
    return null
  }
}
