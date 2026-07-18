import { pool } from '../config/db.js'

export async function createReport(req, res, next) {
  try {
    const { targetType, targetId, reason, details } = req.body
    const { rows } = await pool.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, targetType, targetId, reason, details || null]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
}
