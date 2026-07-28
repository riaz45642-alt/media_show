import crypto from 'node:crypto'
import { pool } from '../config/db.js'
import { isOnline } from '../services/presenceService.js'

const RING_TIMEOUT_MS = 30_000
const ringingTimers = new Map() // callId -> Timeout

async function hasActiveCall(userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM calls WHERE (caller_id = $1 OR callee_id = $1) AND status IN ('ringing','accepted') LIMIT 1`,
    [userId]
  )
  return rows.length > 0
}

async function logEvent(callId, userId, event, metadata = {}) {
  await pool.query(
    `INSERT INTO call_logs (call_id, user_id, event, metadata) VALUES ($1,$2,$3,$4)`,
    [callId, userId, event, metadata]
  ).catch((err) => console.error('call_logs insert failed:', err.message))
}

export function registerCallHandlers(io, socket) {
  const userId = socket.userId

  socket.on('call:invite', async ({ calleeId, kind = 'voice' }, ack) => {
    try {
      if (!calleeId || calleeId === userId) return ack?.({ error: 'Invalid recipient' })
      if (await hasActiveCall(userId)) return ack?.({ error: 'You are already on a call' })
      if (await hasActiveCall(calleeId)) return ack?.({ error: 'busy', message: 'User is on another call' })
      if (!isOnline(calleeId)) return ack?.({ error: 'offline', message: 'User is offline' })

      const { rows: callerRows } = await pool.query(
        `SELECT display_name, avatar_media_id FROM user_profiles WHERE user_id = $1`,
        [userId]
      )
      const roomId = crypto.randomUUID()

      const { rows: callRows } = await pool.query(
        `INSERT INTO calls (caller_id, callee_id, kind, status) VALUES ($1,$2,$3,'ringing') RETURNING id`,
        [userId, calleeId, kind]
      )
      const callId = callRows[0].id
      await pool.query(`INSERT INTO call_sessions (call_id, room_id) VALUES ($1,$2)`, [callId, roomId])
      await pool.query(
        `INSERT INTO call_participants (call_id, user_id, status) VALUES ($1,$2,'invited'), ($1,$3,'invited')`,
        [callId, userId, calleeId]
      )
      await logEvent(callId, userId, 'invite', { kind })

      const payload = {
        callId,
        roomId,
        kind,
        callerId: userId,
        callerName: callerRows[0]?.display_name || 'Unknown',
      }
      io.to(`user:${calleeId}`).emit('call:incoming', payload)
      ack?.({ callId, roomId })

      const timer = setTimeout(async () => {
        const { rows } = await pool.query(`SELECT status FROM calls WHERE id = $1`, [callId])
        if (rows[0]?.status === 'ringing') {
          await pool.query(`UPDATE calls SET status = 'missed', ended_at = now() WHERE id = $1`, [callId])
          await logEvent(callId, null, 'timeout')
          io.to(`user:${userId}`).emit('call:timeout', { callId })
          io.to(`user:${calleeId}`).emit('call:timeout', { callId })
        }
        ringingTimers.delete(callId)
      }, RING_TIMEOUT_MS)
      ringingTimers.set(callId, timer)
    } catch (err) {
      console.error('call:invite failed:', err.message)
      ack?.({ error: 'Failed to start call' })
    }
  })

  socket.on('call:accept', async ({ callId }) => {
    try {
      clearTimeout(ringingTimers.get(callId))
      ringingTimers.delete(callId)

      const { rows } = await pool.query(
        `UPDATE calls SET status = 'accepted', started_at = now() WHERE id = $1 AND status = 'ringing' RETURNING caller_id, callee_id, kind`,
        [callId]
      )
      if (!rows.length) return
      const { caller_id, callee_id } = rows[0]
      await pool.query(
        `UPDATE call_participants SET status = 'joined', joined_at = now() WHERE call_id = $1 AND user_id = ANY($2::uuid[])`,
        [callId, [caller_id, callee_id]]
      )
      await logEvent(callId, userId, 'accept')

      const { rows: sess } = await pool.query(`SELECT room_id FROM call_sessions WHERE call_id = $1`, [callId])
      io.to(`user:${caller_id}`).emit('call:accepted', { callId, roomId: sess[0]?.room_id })
      io.to(`user:${callee_id}`).emit('call:accepted', { callId, roomId: sess[0]?.room_id })
    } catch (err) {
      console.error('call:accept failed:', err.message)
    }
  })

  socket.on('call:decline', async ({ callId }) => {
    clearTimeout(ringingTimers.get(callId))
    ringingTimers.delete(callId)
    const { rows } = await pool.query(
      `UPDATE calls SET status = 'declined', ended_at = now() WHERE id = $1 AND status = 'ringing' RETURNING caller_id, callee_id`,
      [callId]
    )
    if (!rows.length) return
    await logEvent(callId, userId, 'decline')
    io.to(`user:${rows[0].caller_id}`).emit('call:declined', { callId })
  })

  socket.on('call:end', async ({ callId, reason = 'ended' }) => {
    try {
      const { rows } = await pool.query(
        `UPDATE calls SET status = 'ended', ended_at = now(), end_reason = $2,
           duration_seconds = CASE WHEN started_at IS NOT NULL THEN GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at))::int) ELSE 0 END
         WHERE id = $1 AND status IN ('ringing','accepted')
         RETURNING caller_id, callee_id, duration_seconds`,
        [callId, reason]
      )
      if (!rows.length) return
      clearTimeout(ringingTimers.get(callId))
      ringingTimers.delete(callId)
      const { caller_id, callee_id, duration_seconds } = rows[0]
      await pool.query(
        `UPDATE call_participants SET status = 'left', left_at = now() WHERE call_id = $1 AND status = 'joined'`,
        [callId]
      )
      await logEvent(callId, userId, 'end', { reason })
      const otherId = userId === caller_id ? callee_id : caller_id
      io.to(`user:${otherId}`).emit('call:ended', { callId, reason, durationSeconds: duration_seconds })
    } catch (err) {
      console.error('call:end failed:', err.message)
    }
  })

  // WebRTC signaling relay: offer/answer/ICE candidates pass straight
  // through to the other participant's user room.
  socket.on('call:signal', ({ callId, to, data }) => {
    if (!to || !data) return
    io.to(`user:${to}`).emit('call:signal', { callId, from: userId, data })
  })

  socket.on('call:media-state', ({ callId, to, muted, cameraOff }) => {
    if (!to) return
    io.to(`user:${to}`).emit('call:media-state', { callId, from: userId, muted, cameraOff })
  })
}
