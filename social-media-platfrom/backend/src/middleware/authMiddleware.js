import jwt from 'jsonwebtoken'
import { pool } from '../config/db.js'

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authenticated' })
  let claims
  try {
    const token = header.split(' ')[1]
    claims = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || 'media-show-api',
      audience: process.env.JWT_AUDIENCE || 'media-show-web',
    })
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, role, token_version FROM users
       WHERE id = $1::uuid AND status = 'active' AND deleted_at IS NULL`, [claims.id]
    )
    if (!rows[0]) return res.status(401).json({ message: 'Invalid or expired session' })
    req.user = { ...claims, id: rows[0].id, role: rows[0].role }
    next()
  } catch (error) {
    next(error)
  }
}

// Adds viewer identity when a valid token is supplied, while still allowing a
// genuinely public request through. An invalid supplied token is never treated
// as anonymous because that could produce surprising privacy behaviour.
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header) return next()
  return requireAuth(req, res, next)
}
