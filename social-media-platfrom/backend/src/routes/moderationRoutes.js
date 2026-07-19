import { Router } from 'express'
import { analyze } from '../controllers/moderationController.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()
router.post(
  '/analyze',
  validateBody({
    text: { type: 'string', maxLength: 5000 },
    imageBase64: { type: 'string', maxLength: 8_000_000 },
    imageMimeType: { type: 'string', maxLength: 60 },
    contentType: {
      type: 'string',
      oneOf: ['post', 'comment', 'story', 'username', 'displayName', 'bio', 'message', 'search', 'generic'],
    },
  }),
  analyze
)

export default router
