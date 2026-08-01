import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'

export async function getParentControls(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT messaging_enabled, parent_password_hash IS NOT NULL AS parent_password_set
       FROM user_settings WHERE user_id = $1`, [req.user.id]
    )
    res.json(rows[0] || { messaging_enabled: true, parent_password_set: false })
  } catch (error) { next(error) }
}

export async function setParentPassword(req, res, next) {
  try {
    const password = String(req.body.password || '')
    if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Parent password must be 8–128 characters.' })
    const existing = await pool.query(`SELECT parent_password_hash FROM user_settings WHERE user_id = $1`, [req.user.id])
    if (existing.rows[0]?.parent_password_hash) return res.status(409).json({ message: 'Parent password is already configured.' })
    const hash = await bcrypt.hash(password, 12)
    await pool.query(`UPDATE user_settings SET parent_password_hash = $1, updated_at = now() WHERE user_id = $2`, [hash, req.user.id])
    res.status(201).json({ parent_password_set: true })
  } catch (error) { next(error) }
}

export async function updateMessagingPermission(req, res, next) {
  try {
    if (typeof req.body.enabled !== 'boolean') return res.status(400).json({ message: 'enabled must be a boolean.' })
    const password = String(req.body.password || '')
    const { rows } = await pool.query(`SELECT parent_password_hash FROM user_settings WHERE user_id = $1`, [req.user.id])
    if (!rows[0]?.parent_password_hash) return res.status(409).json({ message: 'Create a parent password first.', code: 'PARENT_PASSWORD_REQUIRED' })
    if (!await bcrypt.compare(password, rows[0].parent_password_hash)) {
      return res.status(403).json({ message: 'Incorrect parent password', code: 'INCORRECT_PARENT_PASSWORD' })
    }
    await pool.query(`UPDATE user_settings SET messaging_enabled = $1, updated_at = now() WHERE user_id = $2`, [req.body.enabled, req.user.id])
    res.json({ messaging_enabled: req.body.enabled })
  } catch (error) { next(error) }
}
