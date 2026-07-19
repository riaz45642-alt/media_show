import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { validateBody } from '../middleware/validate.js'
import { adminListAppeals, adminGetAppeal, adminDecideAppeal } from '../controllers/appealController.js'

const router = Router()
router.use(requireAuth, requireAdmin)

router.get('/', adminListAppeals)
router.get('/:id', adminGetAppeal)
router.post(
  '/:id/decision',
  validateBody({
    action: { required: true, type: 'string', oneOf: ['approve', 'reject'] },
    note: { type: 'string', maxLength: 500 },
  }),
  adminDecideAppeal
)

export default router
