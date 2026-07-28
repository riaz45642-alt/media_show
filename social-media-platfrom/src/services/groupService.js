const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'mediashow_token'

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Something went wrong')
  return data
}

export const listGroups = (params = {}) => request(`/groups?${new URLSearchParams(params)}`)
export const suggestedGroups = () => request('/groups/suggested')
export const getGroup = (groupId) => request(`/groups/${groupId}`)
export const createGroup = (payload) => request('/groups', { method: 'POST', body: JSON.stringify(payload) })
export const updateGroup = (groupId, payload) => request(`/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteGroup = (groupId) => request(`/groups/${groupId}`, { method: 'DELETE' })

export const listMembers = (groupId) => request(`/groups/${groupId}/members`)
export const joinGroup = (groupId, message) => request(`/groups/${groupId}/join`, { method: 'POST', body: JSON.stringify({ message }) })
export const listJoinRequests = (groupId) => request(`/groups/${groupId}/join-requests`)
export const reviewJoinRequest = (groupId, requestId, approve) =>
  request(`/groups/${groupId}/join-requests/${requestId}/review`, { method: 'POST', body: JSON.stringify({ approve }) })
export const inviteMember = (groupId, userId) => request(`/groups/${groupId}/invitations`, { method: 'POST', body: JSON.stringify({ userId }) })
export const respondToInvitation = (invitationId, accept) =>
  request(`/groups/invitations/${invitationId}/respond`, { method: 'POST', body: JSON.stringify({ accept }) })
export const removeMember = (groupId, userId) => request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' })
export const setMemberRole = (groupId, userId, role) =>
  request(`/groups/${groupId}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
export const transferOwnership = (groupId, userId) =>
  request(`/groups/${groupId}/transfer-ownership`, { method: 'POST', body: JSON.stringify({ userId }) })
export const leaveGroup = (groupId) => request(`/groups/${groupId}/leave`, { method: 'POST' })

export const listMessages = (groupId, before) => request(`/groups/${groupId}/messages${before ? `?before=${before}` : ''}`)
export const sendMessage = (groupId, payload) => request(`/groups/${groupId}/messages`, { method: 'POST', body: JSON.stringify(payload) })
export const deleteMessage = (groupId, messageId) => request(`/groups/${groupId}/messages/${messageId}`, { method: 'DELETE' })
export const searchMessages = (groupId, q) => request(`/groups/${groupId}/messages/search?q=${encodeURIComponent(q)}`)
export const pinMessage = (groupId, messageId) => request(`/groups/${groupId}/messages/${messageId}/pin`, { method: 'POST' })
export const unpinMessage = (groupId, messageId) => request(`/groups/${groupId}/messages/${messageId}/pin`, { method: 'DELETE' })
export const listPinned = (groupId) => request(`/groups/${groupId}/pinned-messages`)
export const markSeen = (groupId, messageId) => request(`/groups/${groupId}/seen`, { method: 'POST', body: JSON.stringify({ messageId }) })

export const listAnnouncements = (groupId) => request(`/groups/${groupId}/announcements`)
export const createAnnouncement = (groupId, payload) => request(`/groups/${groupId}/announcements`, { method: 'POST', body: JSON.stringify(payload) })
export const listAssignments = (groupId) => request(`/groups/${groupId}/assignments`)
export const createAssignment = (groupId, payload) => request(`/groups/${groupId}/assignments`, { method: 'POST', body: JSON.stringify(payload) })
