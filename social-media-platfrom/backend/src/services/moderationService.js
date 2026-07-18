// Smart Ethical Shield — server-side moderation placeholder.
// Swap `analyzeText` / `analyzeImage` for real calls to an AI moderation
// provider (e.g. a hosted vision/text classification API) when ready.

const BANNED_WORDS = ['hate', 'stupid', 'kill', 'ugly', 'dumb']

export async function analyzeText(text = '') {
  const lower = text.toLowerCase()
  const flags = BANNED_WORDS.filter((w) => lower.includes(w))
  return { safe: flags.length === 0, flags }
}

export async function analyzeImage(_imageUrl) {
  // Placeholder: integrate a real vision-moderation API here.
  return { safe: true, flags: [] }
}

export async function moderate({ text, imageUrl }) {
  const textResult = text ? await analyzeText(text) : { safe: true, flags: [] }
  const imageResult = imageUrl ? await analyzeImage(imageUrl) : { safe: true, flags: [] }
  return {
    status: textResult.safe && imageResult.safe ? 'safe' : 'flagged',
    textResult,
    imageResult,
  }
}
