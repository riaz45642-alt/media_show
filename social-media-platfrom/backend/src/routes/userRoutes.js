import { Router } from 'express'
import { getMe, updateMe, getReputation, getModerationHistory, searchUsers, getUserProfile, getUserPosts, toggleFollow, acceptFollowRequest, listConnections } from '../controllers/userController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()
router.get('/me', requireAuth, getMe)
router.get('/me/moderation-history', requireAuth, getModerationHistory)
router.get('/', requireAuth, searchUsers)
router.get('/:id', requireAuth, getUserProfile)
router.get('/:id/posts', requireAuth, getUserPosts)
router.get('/:id/connections', requireAuth, listConnections)
router.post('/:id/follow', requireAuth, toggleFollow)
router.post('/follow-requests/:requestId/accept', requireAuth, acceptFollowRequest)
router.get('/:id/reputation', requireAuth, getReputation)
router.put(
  '/me',
  requireAuth,
  validateBody({
    name: { type: 'string', minLength: 2, maxLength: 60 },
    username: { type: 'string', minLength: 3, maxLength: 30 },
    bio: { type: 'string', maxLength: 200 },
    contactEmail: { type: 'string', email: true, maxLength: 160 },
    avatarUrl: { type: 'string', maxLength: 2000 },
    isPrivate: { type: 'boolean' },
  }),
  updateMe
)

export default router
