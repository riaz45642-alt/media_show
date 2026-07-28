import { pool } from '../config/db.js'

// GET /api/notifications?category=moderation&unread=true&search=badge
export async function listNotifications(req, res, next) {
  try {
    const { category, unread, search } = req.query
    const params = [req.user.id]
    let where = 'WHERE recipient_id = $1'

    if (category && category !== 'all') {
      params.push(category)
      where += ` AND kind = $${params.length}`
    }
    if (unread === 'true') {
      where += ' AND read_at IS NULL'
    }
    if (search) {
      params.push(`%${search}%`)
      where += ` AND (title ILIKE $${params.length} OR body ILIKE $${params.length})`
    }

    const { rows } = await pool.query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT 100`,
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
