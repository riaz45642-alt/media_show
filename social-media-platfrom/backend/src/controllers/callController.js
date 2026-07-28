import { pool } from '../config/db.js'

export async function listCallHistory(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, cs.room_id,
              up_caller.display_name AS caller_name, up_callee.display_name AS callee_name
       FROM calls c
       LEFT JOIN call_sessions cs ON cs.call_id = c.id
       JOIN user_profiles up_caller ON up_caller.user_id = c.caller_id
       JOIN user_profiles up_callee ON up_callee.user_id = c.callee_id
       WHERE c.caller_id = $1 OR c.callee_id = $1
       ORDER BY c.created_at DESC LIMIT 50`,
      [req.user.id]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

// Used by the client after a reconnect/page-reload to discover whether it
// still has an in-progress call it needs to rejoin.
export async function getActiveCall(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT c.id AS call_id, c.kind, c.status, c.caller_id, c.callee_id, cs.room_id
       FROM calls c JOIN call_sessions cs ON cs.call_id = c.id
       WHERE (c.caller_id = $1 OR c.callee_id = $1) AND c.status IN ('ringing','accepted')
       ORDER BY c.created_at DESC LIMIT 1`,
      [req.user.id]
    )
    res.json(rows[0] || null)
  } catch (err) {
    next(err)
  }
}
