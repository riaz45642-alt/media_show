import { Router } from 'express'
import { createReport } from '../controllers/reportController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()
router.post(
  '/',
  requireAuth,
  validateBody({
    targetType: { required: true, type: 'string', oneOf: ['post', 'comment', 'user', 'message'] },
    targetId: { required: true, type: 'string', maxLength: 100 },
    reason: { required: true, type: 'string', maxLength: 100 },
    details: { type: 'string', maxLength: 1000 },
  }),
  createReport
)

export default router
