import { pool } from '../config/db.js'

// In-memory map of userId -> Set(socketId) for the current process. The
// user_presence table is the source of truth across restarts/instances;
// this map just avoids a DB round trip on every socket event.
const activeSockets = new Map()

export function socketsFor(userId) {
  return activeSockets.get(userId) || new Set()
}

export async function markOnline(userId, socketId) {
  const set = activeSockets.get(userId) || new Set()
  set.add(socketId)
  activeSockets.set(userId, set)

  await pool.query(
    `INSERT INTO user_presence (user_id, status, socket_count, last_active_at, updated_at)
     VALUES ($1, 'online', $2, now(), now())
     ON CONFLICT (user_id) DO UPDATE
       SET status = 'online', socket_count = $2, last_active_at = now(), updated_at = now()`,
    [userId, set.size]
  )
  return set.size === 1 // true if this is the user's first connection
}

export async function markOffline(userId, socketId) {
  const set = activeSockets.get(userId)
  if (set) {
    set.delete(socketId)
    if (set.size === 0) activeSockets.delete(userId)
  }
  const remaining = set ? set.size : 0

  await pool.query(
    `UPDATE user_presence SET status = $2, socket_count = $3, last_active_at = now(), updated_at = now()
     WHERE user_id = $1`,
    [userId, remaining > 0 ? 'online' : 'offline', remaining]
  )
  return remaining === 0 // true if the user has fully disconnected
}

export async function getPresence(userIds) {
  if (!userIds?.length) return []
  const { rows } = await pool.query(
    `SELECT user_id, status, last_active_at FROM user_presence WHERE user_id = ANY($1::uuid[])`,
    [userIds]
  )
  return rows
}

export function isOnline(userId) {
  return socketsFor(userId).size > 0
}
