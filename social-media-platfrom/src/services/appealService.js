// Appeals service. Mirrors moderationService.js's pattern: try the real
// backend (requires a real JWT from AdminModeration-style login), fall back
// to a localStorage-backed mock so the Appeals UI works in demo mode where
// the app uses the mock local auth layer.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const STORAGE_KEY = 'mediashow_mock_appeals'

function authHeaders() {
  const token = sessionStorage.getItem('mediashow_admin_token') || localStorage.getItem('mediashow_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function hasToken() {
  return !!(sessionStorage.getItem('mediashow_admin_token') || localStorage.getItem('mediashow_token'))
}

function readMock() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function writeMock(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export async function submitAppeal({ contentType, contentId, explanation, originalStatus, aiReason, riskScore }) {
  if (hasToken()) {
    const res = await fetch(`${API_URL}/appeals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ contentType, contentId, explanation }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Failed to submit appeal')
    return data
  }

  const appeal = {
    id: `appeal-${Date.now()}`,
    content_type: contentType,
    content_id: contentId,
    original_status: originalStatus,
    ai_reason: aiReason,
    risk_score: riskScore || 0,
    explanation,
    status: 'pending',
    moderator_note: null,
    created_at: new Date().toISOString(),
    reviewed_at: null,
  }
  const list = readMock()
  list.unshift(appeal)
  writeMock(list)
  return appeal
}

export async function listMyAppeals() {
  if (hasToken()) {
    const res = await fetch(`${API_URL}/appeals/me`, { headers: authHeaders() })
    if (res.ok) return res.json()
  }
  return readMock()
}
