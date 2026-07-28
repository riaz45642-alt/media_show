// Client-side moderation entry point. Calls the real hybrid pipeline on the
// backend (rule-based + Gemini + risk scoring). If the backend is unreachable
// (e.g. running the frontend standalone in demo mode), falls back to a local
// keyword check so the "check before you post" UX never hard-fails.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const BANNED_WORDS = ['hate', 'stupid', 'kill', 'ugly', 'dumb']
const MAX_DIMENSION = 1280

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
  const token = sessionStorage.getItem('mediashow_admin_token') || localStorage.getItem('mediashow_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Downscales + JPEG-encodes an image File in the browser before sending it
// to Gemini for vision analysis. Keeps payloads small/fast and normalizes
// format. Returns { base64, mimeType } or null if the file isn't an image
// (e.g. video — image moderation only covers stills for now).
async function fileToBase64Image(file) {
  if (!file || !file.type?.startsWith('image/')) return null
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = dataUrl
  })
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return { base64: jpegDataUrl.split(',')[1], mimeType: 'image/jpeg' }
}

export async function analyzeText(text = '') {
  if (!text) return { safe: true, flags: [] }
  const result = await moderateContent({ text })
  return { safe: result.safe, flags: result.textResult.flags, confidence: result.textResult.available ? 0.9 : 0.6 }
}

// Real image check: resizes/encodes the file, then runs it through the same
// backend pipeline used for posts (rule-based + Gemini vision + risk score).
export async function analyzeImage(file) {
  const result = await moderateContent({ image: file, contentType: 'post' })
  return { safe: result.safe, flags: result.imageResult.flags, confidence: result.imageResult.available ? 0.9 : 0.5 }
}

export async function moderateContent({ text, image, contentType = 'post' }) {
  let imagePayload = null
  if (image) {
    // Accept either a raw File (from a file input) or an already-prepared
    // { base64, mimeType } object.
    imagePayload = image instanceof File || image instanceof Blob ? await fileToBase64Image(image) : image
  }

  try {
    const res = await fetch(`${API_URL}/moderation/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        text,
        contentType,
        imageBase64: imagePayload?.base64,
        imageMimeType: imagePayload?.mimeType,
      }),
    })
    if (!res.ok) throw new Error(`moderation_http_${res.status}`)
    const result = await res.json()
    return {
      safe: result.status === 'safe',
      badge: result.status === 'safe' ? 'verified-safe' : 'under-review',
      textResult: { available: !!result.ai?.text?.available, flags: result.flags, safe: result.status === 'safe' },
      imageResult: {
        available: !!result.ai?.image?.available,
        safe: result.status === 'safe',
        flags: result.ai?.image?.primary_concern ? [result.ai.image.primary_concern] : [],
      },
      riskScore: result.riskScore,
      status: result.status,
      reason: result.reason,
    }
  } catch {
    // Backend/Gemini unreachable — this is a text-only local fallback, so an
    // image that couldn't be checked is intentionally treated as *not yet
    // verified* rather than silently marked safe (surfaced via `available`).
    const fallback = localFallback(text)
    const imageBlocked = !!imagePayload
    return {
      safe: fallback.status === 'safe' && !imageBlocked,
      badge: fallback.status === 'safe' && !imageBlocked ? 'verified-safe' : 'under-review',
      textResult: { available: false, ...fallback },
      imageResult: { available: false, safe: !imageBlocked, flags: imageBlocked ? ['moderation_unavailable'] : [] },
      riskScore: fallback.riskScore,
      status: imageBlocked ? 'flagged' : fallback.status,
      reason: imageBlocked ? 'moderation_service_unreachable' : fallback.reason,
    }
  }
}
