import { Router } from 'express'
import { listPosts, createPost } from '../controllers/postController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.get('/', listPosts)
router.post('/', requireAuth, createPost)

export default router
