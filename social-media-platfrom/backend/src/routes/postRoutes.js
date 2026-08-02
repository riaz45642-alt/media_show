import { Router } from 'express'
import { listPosts, createPost, updatePost, deletePost, toggleReaction } from '../controllers/postController.js'
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js'
import { validateBody } from '../middleware/validate.js'
import { logUploadedMedia, uploadPostMedia } from '../middleware/postUpload.js'

const router = Router()
router.get('/', optionalAuth, listPosts)
router.post(
  '/',
  requireAuth,
  uploadPostMedia,
  logUploadedMedia,
  validateBody({
    text: { type: 'string', maxLength: 5000 },
    tag: { type: 'string', maxLength: 40 },
  }),
  createPost
)
router.patch('/:postId', requireAuth, validateBody({ text: { required: true, type: 'string', maxLength: 5000 } }), updatePost)
router.delete('/:postId', requireAuth, deletePost)
router.post('/:postId/reaction', requireAuth, toggleReaction)

export default router
