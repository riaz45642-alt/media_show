import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import postRoutes from './routes/postRoutes.js'
import moderationRoutes from './routes/moderationRoutes.js'
import reportRoutes from './routes/reportRoutes.js'

dotenv.config()

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || '*' }))
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'SafeZone API' }))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/moderation', moderationRoutes)
app.use('/api/reports', reportRoutes)

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: err.message || 'Server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`SafeZone API running on port ${PORT}`))
