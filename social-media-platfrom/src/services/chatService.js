const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('mediashow_token')
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'Chat request failed')
    error.status = response.status
    throw error
  }
  return data
}

export const searchUsers = (query = '') => request(`/chat/search?q=${encodeURIComponent(query)}`)
export const listConversations = () => request('/chat/conversations')
export const openConversation = (userId) => request('/chat/conversation', { method: 'POST', body: JSON.stringify({ userId }) })
export const listMessages = (conversationId, before = '') => request(`/chat/messages/${conversationId}${before ? `?before=${encodeURIComponent(before)}` : ''}`)
export const sendMessage = (conversationId, payload) => request(`/chat/messages/${conversationId}`, { method: 'POST', body: JSON.stringify(payload) })
export const markRead = (conversationId) => request(`/chat/conversations/${conversationId}/read`, { method: 'POST' })
