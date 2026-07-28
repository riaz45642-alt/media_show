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

export const getCallHistory = () => request('/calls/history')
export const getActiveCall = () => request('/calls/active')
export const getPresence = (userIds) => request(`/presence?userIds=${userIds.join(',')}`)
