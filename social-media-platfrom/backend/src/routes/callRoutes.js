import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import { listCallHistory, getActiveCall } from '../controllers/callController.js'

const router = Router()
router.get('/history', requireAuth, listCallHistory)
router.get('/active', requireAuth, getActiveCall)

export default router
