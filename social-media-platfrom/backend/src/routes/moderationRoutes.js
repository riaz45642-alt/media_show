import { Router } from 'express'
import { analyze } from '../controllers/moderationController.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()
router.post(
  '/analyze',
  validateBody({
    text: { type: 'string', maxLength: 2000 },
    imageUrl: { type: 'string', maxLength: 2000 },
  }),
  analyze
)

export default router
