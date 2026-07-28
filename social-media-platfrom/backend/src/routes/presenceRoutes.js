import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import { bulkPresence } from '../controllers/presenceController.js'

const router = Router()
router.get('/', requireAuth, bulkPresence)

export default router
