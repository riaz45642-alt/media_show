import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import {
  requireGroupMember, listMessages, sendMessage, deleteMessage, searchMessages,
  pinMessage, unpinMessage, listPinned, markSeen,
} from '../controllers/groupMessageController.js'

const router = Router()

router.get('/:groupId/messages', requireAuth, requireGroupMember, listMessages)
router.post('/:groupId/messages', requireAuth, requireGroupMember, sendMessage)
router.delete('/:groupId/messages/:messageId', requireAuth, requireGroupMember, deleteMessage)
router.get('/:groupId/messages/search', requireAuth, requireGroupMember, searchMessages)
router.post('/:groupId/messages/:messageId/pin', requireAuth, requireGroupMember, pinMessage)
router.delete('/:groupId/messages/:messageId/pin', requireAuth, requireGroupMember, unpinMessage)
router.get('/:groupId/pinned-messages', requireAuth, requireGroupMember, listPinned)
router.post('/:groupId/seen', requireAuth, requireGroupMember, markSeen)

export default router
