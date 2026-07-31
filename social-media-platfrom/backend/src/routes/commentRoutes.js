import { Router } from 'express'
import { listComments, createComment } from '../controllers/commentController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { validateBody } from '../middleware/validate.js'
import { rateLimit } from '../middleware/rateLimit.js'

// mounted at /api/posts/:postId/comments
const router = Router({ mergeParams: true })

router.get('/', listComments)
router.post(
  '/',
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 20 }),
  validateBody({ text: { required: true, type: 'string', minLength: 1, maxLength: 2000 } }),
  createComment
)

export default router
