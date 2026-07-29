import { USERS } from '../data/users.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'mediashow_token'
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'
const DEMO_GROUPS_KEY = 'mediashow_demo_groups'

function currentUser() {
  try { return JSON.parse(localStorage.getItem('mediashow_user') || '{}') } catch { return {} }
}

function demoGroups() {
  try { return JSON.parse(localStorage.getItem(DEMO_GROUPS_KEY) || '[]') } catch { return [] }
}

function saveDemoGroups(groups) {
  localStorage.setItem(DEMO_GROUPS_KEY, JSON.stringify(groups))
}

function demoUsers() {
  return USERS.map((user) => ({ id: String(user.id), name: user.name, username: user.username || user.name.toLowerCase().replace(/\s+/g, '.') }))
}

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

export const listGroups = (params = {}) => DEMO_MODE ? Promise.resolve(demoGroups()) : request(`/groups?${new URLSearchParams(params)}`)
export const suggestedGroups = () => DEMO_MODE ? Promise.resolve(demoGroups().slice(0, 5)) : request('/groups/suggested')
export const getGroup = (groupId) => {
  if (!DEMO_MODE) return request(`/groups/${groupId}`)
  const group = demoGroups().find((item) => item.id === groupId)
  return Promise.resolve(group ? { ...group, my_role: 'owner' } : null)
}
export const createGroup = (payload) => {
  if (!DEMO_MODE) return request('/groups', { method: 'POST', body: JSON.stringify(payload) })
  const owner = currentUser()
  const group = {
    id: crypto.randomUUID(), ...payload, owner_id: owner.id || 'me', my_role: 'owner',
    member_count: 1, created_at: new Date().toISOString(),
    members: [{ user_id: owner.id || 'me', display_name: owner.name || 'You', role: 'owner' }],
  }
  saveDemoGroups([group, ...demoGroups()])
  return Promise.resolve(group)
}
export const updateGroup = (groupId, payload) => request(`/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteGroup = (groupId) => request(`/groups/${groupId}`, { method: 'DELETE' })

export const listMembers = (groupId) => {
  if (!DEMO_MODE) return request(`/groups/${groupId}/members`)
  return Promise.resolve(demoGroups().find((group) => group.id === groupId)?.members || [])
}
export const searchUsers = async (search = '') => {
  if (!DEMO_MODE) return request(`/users?search=${encodeURIComponent(search)}`)
  const query = search.trim().toLowerCase()
  const memberId = String(currentUser().id || 'me')
  return demoUsers().filter((user) =>
    user.id !== memberId && (!query || user.name.toLowerCase().includes(query) || user.username.includes(query))
  )
}
export const addMembers = async (groupId, userIds) => {
  if (!DEMO_MODE) {
    return request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ userIds }) })
  }
  const users = demoUsers()
  const groups = demoGroups()
  const group = groups.find((item) => item.id === groupId)
  if (!group) throw new Error('Group not found')
  const existing = new Set((group.members || []).map((member) => String(member.user_id)))
  const selected = users.filter((user) => userIds.includes(user.id) && !existing.has(user.id))
  group.members = [...(group.members || []), ...selected.map((user) => ({
    user_id: user.id, display_name: user.name, role: 'member',
  }))]
  group.member_count = group.members.length
  saveDemoGroups(groups)
  return { addedUserIds: selected.map((user) => user.id), addedCount: selected.length }
}
export const joinGroup = (groupId, message) => request(`/groups/${groupId}/join`, { method: 'POST', body: JSON.stringify({ message }) })
export const listJoinRequests = (groupId) => DEMO_MODE ? Promise.resolve([]) : request(`/groups/${groupId}/join-requests`)
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

export const listMessages = (groupId, before) => {
  if (!DEMO_MODE) return request(`/groups/${groupId}/messages${before ? `?before=${before}` : ''}`)
  return Promise.resolve(demoGroups().find((group) => group.id === groupId)?.messages || [])
}
export const sendMessage = (groupId, payload) => {
  if (!DEMO_MODE) return request(`/groups/${groupId}/messages`, { method: 'POST', body: JSON.stringify(payload) })
  const groups = demoGroups()
  const group = groups.find((item) => item.id === groupId)
  if (!group) return Promise.reject(new Error('Group not found'))
  const sender = currentUser()
  const message = {
    id: crypto.randomUUID(), sender_id: sender.id || 'me', sender_name: sender.name || 'You',
    sent_at: new Date().toISOString(), ...payload,
  }
  group.messages = [...(group.messages || []), message]
  saveDemoGroups(groups)
  return Promise.resolve(message)
}
export const deleteMessage = (groupId, messageId) => {
  if (!DEMO_MODE) return request(`/groups/${groupId}/messages/${messageId}`, { method: 'DELETE' })
  const groups = demoGroups()
  const group = groups.find((item) => item.id === groupId)
  if (group) group.messages = (group.messages || []).filter((message) => message.id !== messageId)
  saveDemoGroups(groups)
  return Promise.resolve({ message: 'Deleted' })
}
export const searchMessages = (groupId, q) => request(`/groups/${groupId}/messages/search?q=${encodeURIComponent(q)}`)
export const pinMessage = (groupId, messageId) => request(`/groups/${groupId}/messages/${messageId}/pin`, { method: 'POST' })
export const unpinMessage = (groupId, messageId) => request(`/groups/${groupId}/messages/${messageId}/pin`, { method: 'DELETE' })
export const listPinned = (groupId) => DEMO_MODE ? Promise.resolve([]) : request(`/groups/${groupId}/pinned-messages`)
export const markSeen = (groupId, messageId) => request(`/groups/${groupId}/seen`, { method: 'POST', body: JSON.stringify({ messageId }) })

export const listAnnouncements = (groupId) => request(`/groups/${groupId}/announcements`)
export const createAnnouncement = (groupId, payload) => request(`/groups/${groupId}/announcements`, { method: 'POST', body: JSON.stringify(payload) })
export const listAssignments = (groupId) => request(`/groups/${groupId}/assignments`)
export const createAssignment = (groupId, payload) => request(`/groups/${groupId}/assignments`, { method: 'POST', body: JSON.stringify(payload) })
