import crypto from 'node:crypto'
import { pool } from '../config/db.js'
import { isOnline } from '../services/presenceService.js'
import { createNotification } from '../services/notificationService.js'

const RING_TIMEOUT_MS = 30_000
const ringingTimers = new Map() // callId -> Timeout
let maintenanceTimer

export function startCallMaintenance(io) {
  const recover = async () => {
    try {
      const { rows } = await pool.query(
        `UPDATE calls SET status = 'missed', ended_at = now(), duration_seconds = 0, end_reason = 'unanswered'
         WHERE status = 'ringing' AND created_at < now() - interval '45 seconds'
         RETURNING id, caller_id, callee_id, kind`
      )
      for (const call of rows) {
        await pool.query(`UPDATE call_sessions SET closed_at = COALESCE(closed_at, now()) WHERE call_id = $1`, [call.id])
        io.to(`user:${call.caller_id}`).emit('call:timeout', { callId: call.id })
        io.to(`user:${call.callee_id}`).emit('call:timeout', { callId: call.id })
        await createNotification({ userId: call.callee_id, actorId: call.caller_id, category: 'calls', type: 'missed_call', text: `Missed ${call.kind} call`, link: '/calls', entityType: 'call', entityId: call.id, data: { callId: call.id, kind: call.kind } })
      }
    } catch (error) { console.error('call maintenance failed:', { message: error.message, code: error.code, stack: error.stack }) }
  }
  recover()
  clearInterval(maintenanceTimer)
  maintenanceTimer = setInterval(recover, 15_000)
  maintenanceTimer.unref?.()
}

export async function endCallsForOfflineUser(io, userId) {
  const { rows } = await pool.query(
    `UPDATE calls SET status = 'ended', ended_at = now(), end_reason = 'disconnected',
       duration_seconds = CASE WHEN started_at IS NULL THEN 0 ELSE GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at))::int) END
     WHERE status = 'accepted' AND (caller_id = $1 OR callee_id = $1)
     RETURNING id, caller_id, callee_id, duration_seconds`, [userId]
  )
  for (const call of rows) {
    await pool.query(`UPDATE call_sessions SET closed_at = COALESCE(closed_at, now()) WHERE call_id = $1`, [call.id])
    await pool.query(`UPDATE call_participants SET status = 'left', left_at = COALESCE(left_at, now()) WHERE call_id = $1 AND status = 'joined'`, [call.id])
    const otherId = call.caller_id === userId ? call.callee_id : call.caller_id
    io.to(`user:${otherId}`).emit('call:ended', { callId: call.id, reason: 'disconnected', durationSeconds: call.duration_seconds })
  }
}

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

async function authorizedCall(callId, userId, statuses = ['ringing', 'accepted']) {
  const { rows } = await pool.query(
    `SELECT c.*, cs.room_id FROM calls c LEFT JOIN call_sessions cs ON cs.call_id = c.id
     WHERE c.id = $1 AND (c.caller_id = $2 OR c.callee_id = $2) AND c.status::text = ANY($3::text[])`,
    [callId, userId, statuses]
  )
  return rows[0] || null
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
        `SELECT up.display_name, ma.storage_path AS avatar_url
         FROM user_profiles up LEFT JOIN media_assets ma ON ma.id = up.avatar_media_id
         WHERE up.user_id = $1`,
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
        callerAvatar: callerRows[0]?.avatar_url || null,
      }
      io.to(`user:${calleeId}`).emit('call:incoming', payload)
      io.to(`user:${userId}`).emit('call:ringing', { callId, roomId })
      ack?.({ callId, roomId })

      const timer = setTimeout(async () => {
        const { rows } = await pool.query(`SELECT status FROM calls WHERE id = $1`, [callId])
        if (rows[0]?.status === 'ringing') {
          await pool.query(`UPDATE calls SET status = 'missed', ended_at = now(), duration_seconds = 0, end_reason = 'unanswered' WHERE id = $1`, [callId])
          await pool.query(`UPDATE call_sessions SET closed_at = now() WHERE call_id = $1`, [callId])
          await logEvent(callId, null, 'timeout')
          io.to(`user:${userId}`).emit('call:timeout', { callId })
          io.to(`user:${calleeId}`).emit('call:timeout', { callId })
          await createNotification({
            userId: calleeId, actorId: userId, category: 'calls', type: 'missed_call',
            text: `Missed ${kind} call`, link: '/calls', entityType: 'call', entityId: callId,
            data: { callId, kind },
          })
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
      const existing = await authorizedCall(callId, userId, ['ringing'])
      if (!existing || existing.callee_id !== userId) return
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
      io.to(`user:${caller_id}`).emit('call:accepted', { callId, roomId: sess[0]?.room_id, role: 'caller', peerId: callee_id })
      io.to(`user:${callee_id}`).emit('call:accepted', { callId, roomId: sess[0]?.room_id, role: 'callee', peerId: caller_id })
    } catch (err) {
      console.error('call:accept failed:', err.message)
    }
  })

  socket.on('call:decline', async ({ callId }) => {
    const existing = await authorizedCall(callId, userId, ['ringing'])
    if (!existing || existing.callee_id !== userId) return
    clearTimeout(ringingTimers.get(callId))
    ringingTimers.delete(callId)
    const { rows } = await pool.query(
      `UPDATE calls SET status = 'declined', ended_at = now() WHERE id = $1 AND status = 'ringing' RETURNING caller_id, callee_id`,
      [callId]
    )
    if (!rows.length) return
    await logEvent(callId, userId, 'decline')
    await pool.query(`UPDATE call_participants SET status = 'declined', left_at = now() WHERE call_id = $1 AND user_id = $2`, [callId, userId])
    await pool.query(`UPDATE call_sessions SET closed_at = now() WHERE call_id = $1`, [callId])
    io.to(`user:${rows[0].caller_id}`).emit('call:declined', { callId })
    io.to(`user:${rows[0].caller_id}`).emit('call:rejected', { callId })
    await createNotification({ userId: rows[0].caller_id, actorId: userId, category: 'calls', type: 'call_declined', text: 'Your call was declined', link: '/calls', entityType: 'call', entityId: callId })
  })

  socket.on('call:end', async ({ callId, reason = 'ended' }) => {
    try {
      if (!await authorizedCall(callId, userId)) return
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
      await pool.query(`UPDATE call_sessions SET closed_at = now() WHERE call_id = $1`, [callId])
      await logEvent(callId, userId, 'end', { reason })
      const otherId = userId === caller_id ? callee_id : caller_id
      io.to(`user:${otherId}`).emit('call:ended', { callId, reason, durationSeconds: duration_seconds })
    } catch (err) {
      console.error('call:end failed:', err.message)
    }
  })

  // WebRTC signaling relay: offer/answer/ICE candidates pass straight
  // through to the other participant's user room.
  socket.on('call:signal', async ({ callId, to, data }) => {
    if (!to || !data) return
    const call = await authorizedCall(callId, userId, ['accepted'])
    const expectedPeer = call && (userId === call.caller_id ? call.callee_id : call.caller_id)
    if (expectedPeer !== to) return
    io.to(`user:${to}`).emit('call:signal', { callId, from: userId, data })
  })

  socket.on('call:media-state', async ({ callId, to, muted, cameraOff }) => {
    if (!to) return
    const call = await authorizedCall(callId, userId, ['accepted'])
    const expectedPeer = call && (userId === call.caller_id ? call.callee_id : call.caller_id)
    if (expectedPeer !== to) return
    io.to(`user:${to}`).emit('call:media-state', { callId, from: userId, muted, cameraOff })
  })
}
