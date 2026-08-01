import { pool } from '../config/db.js'

async function isMember(conversationId, userId) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
    [conversationId, userId]
  )
  return rowCount > 0
}

export function registerDirectChatHandlers(io, socket) {
  socket.on('conversation:join', async ({ conversationId }, ack) => {
    if (!conversationId || !await isMember(conversationId, socket.userId)) return ack?.({ error: 'Conversation access denied' })
    await socket.join(`conversation:${conversationId}`)
    ack?.({ ok: true })
  })
  socket.on('conversation:leave', ({ conversationId }) => socket.leave(`conversation:${conversationId}`))
  socket.on('message:typing', async ({ conversationId, isTyping = false, isRecording = false }) => {
    if (!conversationId || !await isMember(conversationId, socket.userId)) return
    socket.to(`conversation:${conversationId}`).emit('message:typing', {
      conversationId, userId: socket.userId, isTyping: Boolean(isTyping), isRecording: Boolean(isRecording),
    })
  })
}
