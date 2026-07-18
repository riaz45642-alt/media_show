import { Router } from 'express'
import { getMe, updateMe } from '../controllers/userController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.get('/me', requireAuth, getMe)
router.put('/me', requireAuth, updateMe)

export default router
