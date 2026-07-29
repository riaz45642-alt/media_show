import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware.js'
import { validateBody } from '../middleware/validate.js'
import {
  createGroup, updateGroup, deleteGroup, getGroup, listGroups, suggestedGroups,
  listMembers, addMembers, joinOrRequest, listJoinRequests, reviewJoinRequest,
  inviteMember, respondToInvitation, removeMember, setMemberRole, transferOwnership, leaveGroup,
  createAnnouncement, listAnnouncements, createAssignment, listAssignments,
} from '../controllers/groupController.js'

const router = Router()

router.get('/', requireAuth, listGroups)
router.get('/suggested', requireAuth, suggestedGroups)
router.post(
  '/',
  requireAuth,
  validateBody({
    name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
    description: { type: 'string', maxLength: 1000 },
    category: { type: 'string', maxLength: 60 },
    privacy: { type: 'string', oneOf: ['public', 'private'] },
  }),
  createGroup
)
router.get('/:groupId', requireAuth, getGroup)
router.patch('/:groupId', requireAuth, updateGroup)
router.delete('/:groupId', requireAuth, deleteGroup)

router.get('/:groupId/members', requireAuth, listMembers)
router.post(
  '/:groupId/members',
  requireAuth,
  validateBody({
    userIds: { required: true, type: 'array', minLength: 1, maxLength: 30 },
  }),
  addMembers
)
router.post('/:groupId/join', requireAuth, joinOrRequest)
router.get('/:groupId/join-requests', requireAuth, listJoinRequests)
router.post('/:groupId/join-requests/:requestId/review', requireAuth, reviewJoinRequest)
router.post('/:groupId/invitations', requireAuth, inviteMember)
router.post('/invitations/:invitationId/respond', requireAuth, respondToInvitation)
router.delete('/:groupId/members/:userId', requireAuth, removeMember)
router.patch('/:groupId/members/:userId/role', requireAuth, setMemberRole)
router.post('/:groupId/transfer-ownership', requireAuth, transferOwnership)
router.post('/:groupId/leave', requireAuth, leaveGroup)

router.get('/:groupId/announcements', requireAuth, listAnnouncements)
router.post('/:groupId/announcements', requireAuth, createAnnouncement)
router.get('/:groupId/assignments', requireAuth, listAssignments)
router.post('/:groupId/assignments', requireAuth, createAssignment)

export default router
