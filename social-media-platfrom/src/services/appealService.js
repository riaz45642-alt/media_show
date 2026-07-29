const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function authHeaders() {
  const token = sessionStorage.getItem('mediashow_admin_token') || localStorage.getItem('mediashow_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function submitAppeal({ contentType, contentId, explanation }) {
  const response = await fetch(`${API_URL}/appeals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ contentType, contentId, explanation }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Failed to submit appeal')
  return data
}

export async function listMyAppeals() {
  const response = await fetch(`${API_URL}/appeals/me`, { headers: authHeaders() })
  const data = await response.json().catch(() => [])
  if (!response.ok) throw new Error(data.message || 'Failed to load appeals')
  return data
}
