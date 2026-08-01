import { pool } from '../config/db.js'

export async function listCallHistory(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const offset = Math.max(0, Number(req.query.offset) || 0)
    const { rows } = await pool.query(
      `SELECT c.id, c.caller_id, c.callee_id, c.kind, c.status, c.started_at, c.ended_at,
              COALESCE(c.duration_seconds, 0)::int AS duration_seconds, c.end_reason, c.created_at, cs.room_id,
              CASE WHEN c.caller_id = $1 THEN c.callee_id ELSE c.caller_id END AS other_user_id,
              CASE WHEN c.caller_id = $1 THEN up_callee.display_name ELSE up_caller.display_name END AS other_name,
              CASE WHEN c.caller_id = $1 THEN up_callee.username ELSE up_caller.username END AS other_username,
              CASE WHEN c.caller_id = $1 THEN avatar_callee.storage_path ELSE avatar_caller.storage_path END AS other_avatar_url,
              (c.caller_id = $1) AS outgoing
       FROM calls c
       LEFT JOIN call_sessions cs ON cs.call_id = c.id
       JOIN user_profiles up_caller ON up_caller.user_id = c.caller_id
       JOIN user_profiles up_callee ON up_callee.user_id = c.callee_id
       LEFT JOIN media_assets avatar_caller ON avatar_caller.id = up_caller.avatar_media_id AND avatar_caller.deleted_at IS NULL
       LEFT JOIN media_assets avatar_callee ON avatar_callee.id = up_callee.avatar_media_id AND avatar_callee.deleted_at IS NULL
       WHERE c.caller_id = $1 OR c.callee_id = $1
       ORDER BY c.created_at DESC, c.id DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit + 1, offset]
    )
    const hasMore = rows.length > limit
    res.json({ calls: rows.slice(0, limit), hasMore, nextOffset: hasMore ? offset + limit : null })
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
