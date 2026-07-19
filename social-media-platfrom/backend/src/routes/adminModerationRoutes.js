import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { validateBody } from '../middleware/validate.js'
import {
  listQueue,
  listReports,
  applyDecision,
  warnUser,
  banUser,
} from '../controllers/adminModerationController.js'

const router = Router()
router.use(requireAuth, requireAdmin)

router.get('/queue', listQueue)
router.get('/reports', listReports)

router.post(
  '/:type/:id/decision',
  validateBody({
    action: { required: true, type: 'string', oneOf: ['approve', 'reject', 'restore'] },
    note: { type: 'string', maxLength: 500 },
  }),
  applyDecision
)

router.post('/users/:id/warn', warnUser)
router.post('/users/:id/ban', banUser)

export default router
