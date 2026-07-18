// Smart Ethical Shield — placeholder client-side moderation architecture.
// In production this should call a real backend/AI endpoint
// (e.g. POST /api/moderation/analyze) that runs text + image classifiers.
// This mock keeps the same shape so swapping in a real API is a one-line change.

const BANNED_WORDS = ['hate', 'stupid', 'kill', 'ugly', 'dumb']

export async function analyzeText(text = '') {
  await fakeDelay()
  const lower = text.toLowerCase()
  const flagged = BANNED_WORDS.filter((w) => lower.includes(w))
  return {
    safe: flagged.length === 0,
    confidence: flagged.length === 0 ? 0.98 : 0.62,
    flags: flagged,
    category: flagged.length ? 'harmful_language' : null,
  }
}

export async function analyzeImage(_file) {
  await fakeDelay()
  // Placeholder: always resolves safe. Swap with real vision-model API call.
  return { safe: true, confidence: 0.95, flags: [] }
}

export async function moderateContent({ text, image }) {
  const textResult = text ? await analyzeText(text) : { safe: true, flags: [] }
  const imageResult = image ? await analyzeImage(image) : { safe: true, flags: [] }
  const safe = textResult.safe && imageResult.safe
  return {
    safe,
    badge: safe ? 'verified-safe' : 'under-review',
    textResult,
    imageResult,
  }
}

function fakeDelay(ms = 250) {
  return new Promise((res) => setTimeout(res, ms))
}
