import { pool } from '../config/db.js'

// Must run after requireAuth. Looks up the current role rather than trusting
// the JWT payload, so revoking admin access takes effect immediately.
export async function requireAdmin(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id])
    if (rows[0]?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }
    next()
  } catch (err) {
    next(err)
  }
}
