import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import {
  listNotifications,
  markRead,
  markAllRead,
  getPreferences,
  updatePreferences,
} from '../controllers/notificationController.js'

const router = Router()
router.use(requireAuth)

router.get('/', listNotifications)
router.get('/preferences', getPreferences)
router.put('/preferences', updatePreferences)
router.post('/read-all', markAllRead)
router.post('/:id/read', markRead)

export default router
