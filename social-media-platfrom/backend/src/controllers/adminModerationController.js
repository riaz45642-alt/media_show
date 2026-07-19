import { pool } from '../config/db.js'

// GET /api/admin/moderation/queue?status=flagged&type=post
export async function listQueue(req, res, next) {
  try {
    const status = req.query.status || 'flagged'
    const type = req.query.type // optional: post | comment | user

    const results = { posts: [], comments: [], users: [] }

    if (!type || type === 'post') {
      const { rows } = await pool.query(
        `SELECT id, user_id, text_content, image_url, moderation_status, risk_score, moderation_reason, created_at
         FROM posts WHERE moderation_status = $1 ORDER BY risk_score DESC, created_at DESC LIMIT 100`,
        [status]
      )
      results.posts = rows
    }
    if (!type || type === 'comment') {
      const { rows } = await pool.query(
        `SELECT id, user_id, post_id, text_content, moderation_status, risk_score, moderation_reason, created_at
         FROM comments WHERE moderation_status = $1 ORDER BY risk_score DESC, created_at DESC LIMIT 100`,
        [status]
      )
      results.comments = rows
    }
    if (!type || type === 'user') {
      const { rows } = await pool.query(
        `SELECT id, name, email, moderation_status, risk_score, moderation_reason, status, warnings_count
         FROM users WHERE moderation_status = $1 ORDER BY risk_score DESC LIMIT 100`,
        [status]
      )
      results.users = rows
    }

    res.json(results)
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/moderation/reports
export async function listReports(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS reporter_name FROM reports r
       JOIN users u ON u.id = r.reporter_id
       ORDER BY r.created_at DESC LIMIT 200`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

const TABLE_BY_TYPE = { post: 'posts', comment: 'comments', user: 'users' }

// POST /api/admin/moderation/:type/:id/decision  body: { action: 'approve'|'reject'|'restore', note? }
export async function applyDecision(req, res, next) {
  try {
    const { type, id } = req.params
    const { action, note } = req.body
    const table = TABLE_BY_TYPE[type]
    if (!table) return res.status(400).json({ message: 'Invalid content type' })

    const statusMap = { approve: 'safe', reject: 'rejected', restore: 'safe' }
    const newStatus = statusMap[action]
    if (!newStatus) return res.status(400).json({ message: 'Invalid action' })

    const { rows } = await pool.query(
      `UPDATE ${table} SET moderation_status = $1, moderation_reason = COALESCE($2, moderation_reason),
         reviewed_by = $3, reviewed_at = now(), updated_at = now()
       WHERE id = $4 RETURNING *`,
      [newStatus, note || null, req.user.id, id]
    )

    if (!rows[0]) return res.status(404).json({ message: 'Not found' })
    res.json({ updated: rows[0] })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/moderation/users/:id/warn
export async function warnUser(req, res, next) {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      `UPDATE users SET warnings_count = warnings_count + 1, updated_at = now() WHERE id = $1
       RETURNING id, name, warnings_count`,
      [id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'Not found' })
    res.json({ user: rows[0] })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/moderation/users/:id/ban
export async function banUser(req, res, next) {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      `UPDATE users SET status = 'banned', updated_at = now() WHERE id = $1 RETURNING id, name, status`,
      [id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'Not found' })
    res.json({ user: rows[0] })
  } catch (err) {
    next(err)
  }
}
