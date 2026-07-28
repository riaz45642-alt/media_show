// The browser delegates moderation to the production backend. It never
// substitutes a local keyword list for an actual moderation result.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MAX_DIMENSION = 1280

function authHeaders() {
  const token = sessionStorage.getItem('mediashow_admin_token') || localStorage.getItem('mediashow_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fileToBase64Image(file) {
  if (!file || !file.type?.startsWith('image/')) return null
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const img = await new Promise((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = reject
    element.src = dataUrl
  })
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return { base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg' }
}

export async function analyzeText(text = '') {
  if (!text) return { safe: true, flags: [] }
  const result = await moderateContent({ text })
  return {
    safe: result.safe,
    flags: result.textResult.flags,
    confidence: result.textResult.available ? 0.9 : 0,
    serviceUnavailable: result.serviceUnavailable,
  }
}

export async function analyzeImage(file) {
  const result = await moderateContent({ image: file, contentType: 'post' })
  return {
    safe: result.safe,
    flags: result.imageResult.flags,
    confidence: result.imageResult.available ? 0.9 : 0,
    serviceUnavailable: result.serviceUnavailable,
  }
}

export async function moderateContent({ text, image, contentType = 'post' }) {
  let imagePayload = null
  if (image) {
    imagePayload = image instanceof File || image instanceof Blob ? await fileToBase64Image(image) : image
  }

  try {
    const response = await fetch(`${API_URL}/moderation/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        text,
        contentType,
        imageBase64: imagePayload?.base64,
        imageMimeType: imagePayload?.mimeType,
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || `moderation_http_${response.status}`)

    return {
      safe: result.status === 'safe',
      badge: result.status === 'safe' ? 'verified-safe' : 'under-review',
      textResult: {
        available: Boolean(result.ai?.text?.available),
        flags: result.flags || [],
        safe: result.status === 'safe',
      },
      imageResult: {
        available: Boolean(result.ai?.image?.available),
        safe: result.status === 'safe',
        flags: result.ai?.image?.primary_concern ? [result.ai.image.primary_concern] : [],
      },
      riskScore: result.riskScore,
      status: result.status,
      reason: result.reason,
    }
  } catch {
    return {
      safe: false,
      serviceUnavailable: true,
      badge: 'under-review',
      textResult: { available: false, safe: false, flags: ['moderation_unavailable'] },
      imageResult: { available: false, safe: false, flags: imagePayload ? ['moderation_unavailable'] : [] },
      riskScore: null,
      status: 'unavailable',
      reason: 'moderation_service_unreachable',
    }
  }
}
