import { pool } from '../config/db.js'

export async function requireVerified(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT status, reverify_after, revoked_at
       FROM user_verification_status
       WHERE user_id = $1`,
      [req.user.id]
    )
    const verification = rows[0]
    const valid =
      verification?.status === 'verified' &&
      !verification.revoked_at &&
      (!verification.reverify_after || new Date(verification.reverify_after) > new Date())

    if (!valid) {
      return res.status(403).json({
        code: 'FACE_VERIFICATION_REQUIRED',
        message: 'Complete face verification before interacting with other people.',
      })
    }
    next()
  } catch (error) {
    next(error)
  }
}
