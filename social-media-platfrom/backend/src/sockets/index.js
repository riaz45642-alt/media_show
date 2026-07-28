import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { markOnline, markOffline } from '../services/presenceService.js'
import { registerCallHandlers } from './callHandlers.js'
import { registerGroupHandlers } from './groupHandlers.js'

let io

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || '*' },
    maxHttpBufferSize: 1e6,
  })

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1]
      if (!token) return next(new Error('Not authenticated'))
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = payload.id
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.userId
    socket.join(`user:${userId}`)

    const firstConnection = await markOnline(userId, socket.id)
    if (firstConnection) io.emit('presence:update', { userId, status: 'online' })

    registerCallHandlers(io, socket)
    registerGroupHandlers(io, socket)

    socket.on('presence:ping', async () => {
      await markOnline(userId, socket.id)
    })

    socket.on('disconnect', async () => {
      const fullyOffline = await markOffline(userId, socket.id)
      if (fullyOffline) io.emit('presence:update', { userId, status: 'offline' })
    })
  })

  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized yet')
  return io
}
