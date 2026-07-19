import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import { validateBody } from '../middleware/validate.js'
import { createAppeal, listMyAppeals, getMyAppeal } from '../controllers/appealController.js'

const router = Router()
router.use(requireAuth)

router.get('/me', listMyAppeals)
router.get('/:id', getMyAppeal)
router.post(
  '/',
  validateBody({
    contentType: { required: true, type: 'string', oneOf: ['post', 'comment', 'user'] },
    contentId: { required: true, type: 'string', maxLength: 100 },
    explanation: { required: true, type: 'string', minLength: 10, maxLength: 1000 },
  }),
  createAppeal
)

export default router
