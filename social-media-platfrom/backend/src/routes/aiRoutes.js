import { Router } from 'express'
import { chat } from '../controllers/aiController.js'
import { validateBody } from '../middleware/validate.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()
const chatLimiter = rateLimit({ windowMs: 60_000, max: 20 })

router.post(
  '/chat',
  chatLimiter,
  validateBody({
    message: { required: true, type: 'string', minLength: 1, maxLength: 2000 },
  }),
  chat
)

export default router
