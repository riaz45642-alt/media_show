import { Router } from 'express'
import { listPosts, createPost } from '../controllers/postController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()
router.get('/', listPosts)
router.post(
  '/',
  requireAuth,
  validateBody({
    text: { type: 'string', maxLength: 2000 },
    imageUrl: { type: 'string', maxLength: 2000 },
    tag: { type: 'string', maxLength: 40 },
  }),
  createPost
)

export default router
