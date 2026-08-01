import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import { uploadStoryMedia } from '../middleware/postUpload.js'
import { createStory, listStories, markStoryViewed, toggleStoryLike } from '../controllers/storyController.js'

const router = Router()
router.get('/', requireAuth, listStories)
router.post('/',
  (req, _res, next) => {
    console.info(JSON.stringify({ level: 'info', event: 'story_upload_received', requestId: req.requestId }))
    next()
  },
  requireAuth,
  (req, _res, next) => {
    console.info(JSON.stringify({ level: 'info', event: 'story_authentication_passed', requestId: req.requestId, userId: req.user.id }))
    next()
  },
  uploadStoryMedia,
  (req, _res, next) => {
    console.info(JSON.stringify({
      level: 'info', event: 'story_file_received', requestId: req.requestId,
      userId: req.user.id, fileName: req.file?.originalname, mimeType: req.file?.mimetype, byteSize: req.file?.size,
    }))
    next()
  },
  createStory,
)
router.post('/:storyId/view', requireAuth, markStoryViewed)
router.post('/:storyId/like', requireAuth, toggleStoryLike)
export default router
