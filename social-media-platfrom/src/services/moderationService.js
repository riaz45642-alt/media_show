// Client-side moderation entry point. Calls the real hybrid pipeline on the
// backend (rule-based + Gemini + risk scoring). If the backend is unreachable
// (e.g. running the frontend standalone in demo mode), falls back to a local
// keyword check so the "check before you post" UX never hard-fails.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const BANNED_WORDS = ['hate', 'stupid', 'kill', 'ugly', 'dumb']

function localFallback(text = '') {
  const lower = text.toLowerCase()
  const flagged = BANNED_WORDS.filter((w) => lower.includes(w))
  return {
    status: flagged.length ? 'flagged' : 'safe',
    riskScore: flagged.length ? 60 : 0,
    reason: flagged.length ? 'offline_fallback_keyword_match' : null,
    flags: flagged,
  }
}

function authHeaders() {
  const token = sessionStorage.getItem('safezone_admin_token') || localStorage.getItem('safezone_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function analyzeText(text = '') {
  if (!text) return { safe: true, flags: [] }
  const result = await moderateContent({ text })
  return { safe: result.safe, flags: result.textResult.flags, confidence: result.textResult.available ? 0.9 : 0.6 }
}

export async function analyzeImage(_file) {
  // Local demo mode has no way to send a File to the backend without a real
  // upload endpoint; treated as safe here. Real image uploads should go
  // through POST /api/posts with `imageBase64`, which IS moderated server-side.
  return { safe: true, confidence: 0.5, flags: [] }
}

export async function moderateContent({ text, image, contentType = 'post' }) {
  try {
    const res = await fetch(`${API_URL}/moderation/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ text, contentType }),
    })
    if (!res.ok) throw new Error(`moderation_http_${res.status}`)
    const result = await res.json()
    return {
      safe: result.status === 'safe',
      badge: result.status === 'safe' ? 'verified-safe' : 'under-review',
      textResult: { available: true, flags: result.flags, safe: result.status === 'safe' },
      imageResult: { safe: true, flags: [] },
      riskScore: result.riskScore,
      status: result.status,
    }
  } catch {
    const fallback = localFallback(text)
    return {
      safe: fallback.status === 'safe',
      badge: fallback.status === 'safe' ? 'verified-safe' : 'under-review',
      textResult: { available: false, ...fallback },
      imageResult: { safe: true, flags: [] },
      riskScore: fallback.riskScore,
      status: fallback.status,
    }
  }
}
