import { Router } from 'express'
import { getMe, updateMe, getReputation, getModerationHistory } from '../controllers/userController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()
router.get('/me', requireAuth, getMe)
router.get('/me/moderation-history', requireAuth, getModerationHistory)
router.get('/:id/reputation', requireAuth, getReputation)
router.put(
  '/me',
  requireAuth,
  validateBody({
    name: { type: 'string', minLength: 2, maxLength: 60 },
    bio: { type: 'string', maxLength: 300 },
    avatarUrl: { type: 'string', maxLength: 2000 },
  }),
  updateMe
)

export default router
