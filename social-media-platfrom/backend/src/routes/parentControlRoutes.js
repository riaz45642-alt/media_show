import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import { getParentControls, setParentPassword, updateMessagingPermission, updateDailyLimit, getUsageStatus, recordUsageHeartbeat } from '../controllers/parentControlController.js'

const router = Router()
router.get('/', requireAuth, getParentControls)
router.post('/password', requireAuth, setParentPassword)
router.patch('/messaging', requireAuth, updateMessagingPermission)
router.patch('/daily-limit', requireAuth, updateDailyLimit)
router.get('/usage', requireAuth, getUsageStatus)
router.post('/usage/heartbeat', requireAuth, recordUsageHeartbeat)
export default router
