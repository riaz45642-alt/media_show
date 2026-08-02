import { pool } from '../config/db.js'
import { emitToCurrentGroupMembers } from '../services/groupRealtimeService.js'

async function isMember(groupId, userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  )
  return rows.length > 0
}

export function registerGroupHandlers(io, socket) {
  const userId = socket.userId

  socket.on('group:join', async ({ groupId }, ack) => {
    if (!(await isMember(groupId, userId))) return ack?.({ error: 'Not a member of this group' })
    socket.join(`group:${groupId}`)
    ack?.({ ok: true })
  })

  socket.on('group:leave', ({ groupId }) => {
    socket.leave(`group:${groupId}`)
  })

  socket.on('group:typing', async ({ groupId, isTyping }) => {
    if (!(await isMember(groupId, userId))) return
    await emitToCurrentGroupMembers(groupId, 'group:typing', { groupId, userId, isTyping: !!isTyping }, userId)
  })
}
