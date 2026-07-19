import { pool } from '../config/db.js'
import { createNotification } from '../services/notificationService.js'

const TABLE_BY_TYPE = { post: 'posts', comment: 'comments', user: 'users' }

// POST /api/appeals  body: { contentType, contentId, explanation }
export async function createAppeal(req, res, next) {
  try {
    const { contentType, contentId, explanation } = req.body
    const table = TABLE_BY_TYPE[contentType]
    if (!table) return res.status(400).json({ message: 'Invalid content type' })

    const contentCol = contentType === 'user' ? 'id' : 'id'
    const { rows: contentRows } = await pool.query(
      `SELECT * FROM ${table} WHERE ${contentCol} = $1`,
      [contentId]
    )
    const content = contentRows[0]
    if (!content) return res.status(404).json({ message: 'Content not found' })
    if (contentType !== 'user' && content.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only appeal your own content' })
    }
    if (!['flagged', 'rejected'].includes(content.moderation_status)) {
      return res.status(422).json({ message: 'Only flagged or rejected content can be appealed' })
    }

    const { rows: existing } = await pool.query(
      `SELECT id FROM appeals WHERE content_type = $1 AND content_id = $2 AND status = 'pending'`,
      [contentType, contentId]
    )
    if (existing[0]) return res.status(409).json({ message: 'An appeal for this content is already pending' })

    const { rows } = await pool.query(
      `INSERT INTO appeals (user_id, content_type, content_id, original_status, ai_reason, risk_score, explanation)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, contentType, contentId, content.moderation_status, content.moderation_reason, content.risk_score || 0, explanation]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
}

// GET /api/appeals/me
export async function listMyAppeals(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM appeals WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

// GET /api/appeals/:id  (owner only)
export async function getMyAppeal(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT * FROM appeals WHERE id = $1 AND user_id = $2`, [
      req.params.id,
      req.user.id,
    ])
    if (!rows[0]) return res.status(404).json({ message: 'Appeal not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/appeals?status=pending
export async function adminListAppeals(req, res, next) {
  try {
    const status = req.query.status
    const params = []
    let where = ''
    if (status && status !== 'all') {
      params.push(status)
      where = 'WHERE a.status = $1'
    }
    const { rows } = await pool.query(
      `SELECT a.*, u.name AS user_name, u.email AS user_email
       FROM appeals a JOIN users u ON u.id = a.user_id
       ${where} ORDER BY a.created_at DESC LIMIT 200`,
      params
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/appeals/:id  — includes the original content for review
export async function adminGetAppeal(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.name AS user_name, u.email AS user_email FROM appeals a
       JOIN users u ON u.id = a.user_id WHERE a.id = $1`,
      [req.params.id]
    )
    const appeal = rows[0]
    if (!appeal) return res.status(404).json({ message: 'Appeal not found' })

    const table = TABLE_BY_TYPE[appeal.content_type]
    const { rows: contentRows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [appeal.content_id])
    res.json({ appeal, content: contentRows[0] || null })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/appeals/:id/decision  body: { action: 'approve'|'reject', note }
export async function adminDecideAppeal(req, res, next) {
  try {
    const { action, note } = req.body
    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { rows } = await pool.query(
      `UPDATE appeals SET status = $1, moderator_note = COALESCE($2, moderator_note),
         reviewed_by = $3, reviewed_at = now(), updated_at = now()
       WHERE id = $4 RETURNING *`,
      [newStatus, note || null, req.user.id, req.params.id]
    )
    const appeal = rows[0]
    if (!appeal) return res.status(404).json({ message: 'Appeal not found' })

    if (action === 'approve') {
      const table = TABLE_BY_TYPE[appeal.content_type]
      await pool.query(
        `UPDATE ${table} SET moderation_status = 'safe', reviewed_by = $1, reviewed_at = now(), updated_at = now()
         WHERE id = $2`,
        [req.user.id, appeal.content_id]
      )
    }

    await createNotification({
      userId: appeal.user_id,
      category: 'appeals',
      type: 'appeal',
      text:
        action === 'approve'
          ? 'Your appeal was approved and your content has been restored.'
          : 'Your appeal was reviewed and was not approved.',
      link: `/appeals/${appeal.id}`,
    })

    res.json(appeal)
  } catch (err) {
    next(err)
  }
}
