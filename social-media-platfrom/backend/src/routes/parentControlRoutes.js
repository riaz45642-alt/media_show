import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import { getParentControls, setParentPassword, updateMessagingPermission } from '../controllers/parentControlController.js'

const router = Router()
router.get('/', requireAuth, getParentControls)
router.post('/password', requireAuth, setParentPassword)
router.patch('/messaging', requireAuth, updateMessagingPermission)
export default router
