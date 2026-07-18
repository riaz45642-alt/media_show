import { Router } from 'express'
import { signup, login } from '../controllers/authController.js'
import { validateBody } from '../middleware/validate.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()
const authLimiter = rateLimit({ windowMs: 60_000, max: 10 })

router.post(
  '/signup',
  authLimiter,
  validateBody({
    name: { required: true, type: 'string', minLength: 2, maxLength: 60 },
    email: { required: true, type: 'string', email: true, maxLength: 120 },
    password: { required: true, type: 'string', minLength: 8, maxLength: 200 },
    age: { required: true, type: 'number', min: 5, max: 120 },
  }),
  signup
)

router.post(
  '/login',
  authLimiter,
  validateBody({
    email: { required: true, type: 'string', email: true },
    password: { required: true, type: 'string' },
  }),
  login
)

export default router
