// Google Gemini integration for context-aware content moderation.
// Uses global fetch (Node 18+) so no extra dependency is required.
// If GEMINI_API_KEY is not configured, calls resolve to a neutral "unknown"
// result rather than throwing, so the rest of the pipeline (rule-based +
// human review) keeps the platform usable without the key configured.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const CATEGORIES = [
  'toxicity', 'hate_speech', 'harassment', 'bullying', 'violence',
  'adult_sexual_content', 'self_harm', 'extremism', 'misinformation',
  'scam_or_fraud', 'threats', 'contextual_offensive_language',
]

const SYSTEM_INSTRUCTION = `You are a content moderation classifier for a social media platform that is safe for teens and adults.
Analyze the provided content and return ONLY a JSON object (no markdown, no prose) with this exact shape:
{
  "categories": { "toxicity": 0-100, "hate_speech": 0-100, "harassment": 0-100, "bullying": 0-100, "violence": 0-100, "adult_sexual_content": 0-100, "self_harm": 0-100, "extremism": 0-100, "misinformation": 0-100, "scam_or_fraud": 0-100, "threats": 0-100, "contextual_offensive_language": 0-100 },
  "overall_score": 0-100,
  "primary_concern": "string or null",
  "explanation": "one short sentence"
}
Higher scores mean more severe/unsafe. Consider sarcasm, context, and reclaimed language rather than flagging on keywords alone.`

function emptyResult(reason) {
  return {
    available: false,
    reason,
    categories: Object.fromEntries(CATEGORIES.map((c) => [c, 0])),
    overall_score: 0,
    primary_concern: null,
    explanation: reason,
  }
}

function parseModelJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  return {
    available: true,
    categories: parsed.categories || {},
    overall_score: Number(parsed.overall_score) || 0,
    primary_concern: parsed.primary_concern || null,
    explanation: parsed.explanation || '',
  }
}

async function callGemini(parts, timeoutMs = 8000) {
  if (!GEMINI_API_KEY) return emptyResult('gemini_api_key_not_configured')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    })

    if (!res.ok) {
      return emptyResult(`gemini_http_${res.status}`)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return emptyResult('gemini_empty_response')

    return parseModelJson(text)
  } catch (err) {
    return emptyResult(err.name === 'AbortError' ? 'gemini_timeout' : 'gemini_call_failed')
  } finally {
    clearTimeout(timer)
  }
}

/** Analyze text content for toxicity/hate/harassment/etc. */
export async function analyzeTextWithGemini(text) {
  if (!text?.trim()) return emptyResult('no_text')
  return callGemini([{ text }])
}

/**
 * Analyze an image using Gemini's multimodal vision, covering nudity/violence/
 * weapons/disturbing-imagery style categories using the same scoring shape.
 * @param {{ base64, mimeType }} image
 */
export async function analyzeImageWithGemini(image) {
  if (!image?.base64) return emptyResult('no_image')
  return callGemini([
    { text: 'Analyze this image for unsafe content per the categories described.' },
    { inline_data: { mime_type: image.mimeType || 'image/jpeg', data: image.base64 } },
  ])
}

export { CATEGORIES as GEMINI_CATEGORIES }
