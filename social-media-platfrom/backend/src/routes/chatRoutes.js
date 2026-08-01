import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import {
  searchChatUsers, createConversation, listConversations, listDirectMessages,
  sendDirectMessage, markConversationRead,
} from '../controllers/chatController.js'

const router = Router()
router.use(requireAuth)
router.get('/search', searchChatUsers)
router.post('/conversation', createConversation)
router.get('/conversations', listConversations)
router.get('/messages/:conversationId', listDirectMessages)
router.post('/messages/:conversationId', sendDirectMessage)
router.post('/conversations/:conversationId/read', markConversationRead)

export default router
