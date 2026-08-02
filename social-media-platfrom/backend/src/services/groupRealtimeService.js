import { pool } from '../config/db.js'
import { getIO } from '../sockets/index.js'

export async function emitToCurrentGroupMembers(groupId, event, payload, excludeUserId = null) {
  const { rows } = await pool.query(
    `SELECT gm.user_id FROM group_members gm
     JOIN users u ON u.id = gm.user_id AND u.status = 'active' AND u.deleted_at IS NULL
     WHERE gm.group_id = $1::uuid AND ($2::uuid IS NULL OR gm.user_id <> $2::uuid)`,
    [groupId, excludeUserId]
  )
  const rooms = rows.map(({ user_id }) => `user:${user_id}`)
  if (rooms.length) getIO().to(rooms).emit(event, payload)
  console.info(JSON.stringify({
    level: 'info', event: 'group_event_targeted', groupId,
    socketEvent: event, recipientCount: rooms.length, excludedUserId: excludeUserId,
  }))
  return rows.map(({ user_id }) => user_id)
}
