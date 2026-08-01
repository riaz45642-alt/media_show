import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import { uploadStoryMedia } from '../middleware/postUpload.js'
import { createStory, listStories, markStoryViewed, toggleStoryLike } from '../controllers/storyController.js'

const router = Router()
router.get('/', requireAuth, listStories)
router.post('/', requireAuth, uploadStoryMedia, createStory)
router.post('/:storyId/view', requireAuth, markStoryViewed)
router.post('/:storyId/like', requireAuth, toggleStoryLike)
export default router
