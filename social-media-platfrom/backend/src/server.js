import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

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

dotenv.config()

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Set it in your .env before deploying to production.')
}

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || '*' }))
// Cap request body size to guard against oversized payloads.
app.use(express.json({ limit: '2mb' }))

// Lightweight security headers (kept dependency-free rather than pulling in helmet).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'SafeZone API' }))

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

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  // Malformed JSON from express.json() lands here as a SyntaxError.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' })
  }
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`SafeZone API running on port ${PORT}`))
