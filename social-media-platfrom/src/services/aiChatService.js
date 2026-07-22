// Talks to the backend's Gemini-powered "Media Show AI" assistant. Falls back
// to a friendly offline message if the backend can't be reached, matching
// the resilience pattern used by moderationService.js / authService.js.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function authHeaders() {
  const token = localStorage.getItem('mediashow_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function askMediaShowAI(message, history = []) {
  try {
    const res = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ message, history }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'ai_chat_failed')
    return data.reply
  } catch {
    return "Media Show AI is offline right now (backend not reachable). Please try again once it's running."
  }
}
