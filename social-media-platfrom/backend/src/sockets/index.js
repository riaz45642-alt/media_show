import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { markOnline, markOffline } from '../services/presenceService.js'
import { registerCallHandlers } from './callHandlers.js'
import { registerGroupHandlers } from './groupHandlers.js'
import { registerDirectChatHandlers } from './directChatHandlers.js'
import { corsOriginCallback } from '../config/cors.js'

let io

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: corsOriginCallback },
    maxHttpBufferSize: 1e6,
  })

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1]
      if (!token) return next(new Error('Not authenticated'))
      const verifyOptions = {}
      if (process.env.JWT_ISSUER) verifyOptions.issuer = process.env.JWT_ISSUER
      if (process.env.JWT_AUDIENCE) verifyOptions.audience = process.env.JWT_AUDIENCE
      const payload = jwt.verify(token, process.env.JWT_SECRET, verifyOptions)
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
    if (firstConnection) {
      const payload = { userId, status: 'online' }
      io.emit('presence:update', payload)
      io.emit('user:online', payload)
    }

    registerCallHandlers(io, socket)
    registerGroupHandlers(io, socket)
    registerDirectChatHandlers(io, socket)

    socket.on('presence:ping', async () => {
      await markOnline(userId, socket.id)
    })

    socket.on('disconnect', async () => {
      const fullyOffline = await markOffline(userId, socket.id)
      if (fullyOffline) {
        const payload = { userId, status: 'offline', lastSeen: new Date().toISOString() }
        io.emit('presence:update', payload)
        io.emit('user:offline', payload)
      }
    })
  })

  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized yet')
  return io
}
