import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'node:http'
import crypto from 'node:crypto'

import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import postRoutes from './routes/postRoutes.js'
import moderationRoutes from './routes/moderationRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import commentRoutes from './routes/commentRoutes.js'
import adminModerationRoutes from './routes/adminModerationRoutes.js'
import appealRoutes from './routes/appealRoutes.js'
import adminAppealRoutes from './routes/adminAppealRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import groupRoutes from './routes/groupRoutes.js'
import groupMessageRoutes from './routes/groupMessageRoutes.js'
import callRoutes from './routes/callRoutes.js'
import presenceRoutes from './routes/presenceRoutes.js'
import { initSocket } from './sockets/index.js'
import { checkDatabase } from './config/db.js'
import { corsOriginCallback } from './config/cors.js'

dotenv.config()

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET is required and must contain at least 32 characters')
}

const app = express()

app.use(cors({
  origin: corsOriginCallback,
}))
// Cap request body size to guard against oversized payloads.
app.use(express.json({ limit: '2mb' }))
app.use((req, res, next) => {
  req.requestId = req.get('x-request-id') || crypto.randomUUID()
  res.setHeader('X-Request-Id', req.requestId)
  next()
})

// Lightweight security headers (kept dependency-free rather than pulling in helmet).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Media Show API',
    message: 'Backend is running. Open the frontend at http://localhost:5173.',
    health: '/api/health',
  })
})

app.get('/api/health', async (req, res) => {
  try {
    const database = await checkDatabase()
    res.json({ status: 'ok', service: 'Media Show API', database: { status: 'ok', latencyMs: database.latencyMs } })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', event: 'health_check_failed', requestId: req.requestId, error: serializeError(error),
    }))
    res.status(503).json({ status: 'degraded', service: 'Media Show API', database: { status: 'unavailable' } })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/posts/:postId/comments', commentRoutes)
app.use('/api/moderation', moderationRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/admin/moderation', adminModerationRoutes)
app.use('/api/appeals', appealRoutes)
app.use('/api/admin/appeals', adminAppealRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/groups', groupMessageRoutes)
app.use('/api/calls', callRoutes)
app.use('/api/presence', presenceRoutes)

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.type === 'entity.parse.failed'
    ? 400
    : (Number.isInteger(err.status) ? err.status : 500)
  console.error(JSON.stringify({
    level: 'error',
    event: 'request_failed',
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    payload: sanitizePayload(req.body),
    error: serializeError(err),
  }))
  // Malformed JSON from express.json() lands here as a SyntaxError.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' })
  }
  res.status(status).json({ message: status < 500 ? err.message : 'Server error', requestId: req.requestId })
})

function sanitizePayload(value) {
  if (!value || typeof value !== 'object') return value
  const sensitive = /password|token|secret|authorization|cookie|imagebase64/i
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key, sensitive.test(key) ? '[REDACTED]' : item,
  ]))
}

function serializeError(error) {
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    detail: error.detail,
    constraint: error.constraint,
    table: error.table,
    schema: error.schema,
    address: error.address,
    port: error.port,
    stack: error.stack,
    cause: error.cause ? serializeError(error.cause) : undefined,
  }
}

const httpServer = createServer(app)
initSocket(httpServer)

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => console.log(`Media Show API (with realtime) running on port ${PORT}`))
