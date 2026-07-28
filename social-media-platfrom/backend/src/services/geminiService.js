// Google Gemini integration for context-aware content moderation.
// Uses global fetch (Node 18+) so no extra dependency is required.
// If GEMINI_API_KEY is not configured, calls resolve to a neutral "unknown"
// result rather than throwing, so the rest of the pipeline (rule-based +
// human review) keeps the platform usable without the key configured.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 3

const SAFETY_SETTINGS = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_LOW_AND_ABOVE' }))

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
    categories: Object.fromEntries(CATEGORIES.map((category) => [
      category,
      Math.max(0, Math.min(100, Number(parsed.categories?.[category]) || 0)),
    ])),
    overall_score: Math.max(0, Math.min(100, Number(parsed.overall_score) || 0)),
    primary_concern: parsed.primary_concern || null,
    explanation: parsed.explanation || '',
  }
}

function safetyBlockedResult(data) {
  const promptBlocked = data?.promptFeedback?.blockReason
  const candidate = data?.candidates?.[0]
  if (!promptBlocked && candidate?.finishReason !== 'SAFETY') return null

  const ratings = data?.promptFeedback?.safetyRatings || candidate?.safetyRatings || []
  const categoryMap = {
    HARM_CATEGORY_HARASSMENT: 'harassment',
    HARM_CATEGORY_HATE_SPEECH: 'hate_speech',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'adult_sexual_content',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'violence',
  }
  const categories = Object.fromEntries(CATEGORIES.map((category) => [category, 0]))
  for (const rating of ratings) {
    const category = categoryMap[rating.category]
    if (category) categories[category] = rating.blocked ? 95 : 75
  }
  return {
    available: true,
    reason: 'gemini_safety_block',
    categories,
    overall_score: 95,
    primary_concern: Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unsafe_content',
    explanation: 'Content was blocked by the provider safety filters.',
  }
}

const MODERATION_SCHEMA = {
  type: 'OBJECT',
  required: ['categories', 'overall_score', 'primary_concern', 'explanation'],
  properties: {
    categories: {
      type: 'OBJECT',
      required: CATEGORIES,
      properties: Object.fromEntries(CATEGORIES.map((category) => [
        category,
        { type: 'INTEGER', minimum: 0, maximum: 100 },
      ])),
    },
    overall_score: { type: 'INTEGER', minimum: 0, maximum: 100 },
    primary_concern: { type: 'STRING', nullable: true },
    explanation: { type: 'STRING' },
  },
}

async function callGemini(parts, timeoutMs = 8000) {
  if (!GEMINI_API_KEY) return emptyResult('gemini_api_key_not_configured')

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts }],
          safetySettings: SAFETY_SETTINGS,
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: MODERATION_SCHEMA,
            maxOutputTokens: 1200,
          },
        }),
      })
      if (!res.ok) {
        if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** (attempt - 1))))
          continue
        }
        return emptyResult(`gemini_http_${res.status}`)
      }

      const data = await res.json()
      const blocked = safetyBlockedResult(data)
      if (blocked) return blocked
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) return emptyResult('gemini_empty_response')
      return parseModelJson(text)
    } catch (err) {
      if (attempt === MAX_ATTEMPTS || err.name === 'AbortError') {
        return emptyResult(err.name === 'AbortError' ? 'gemini_timeout' : 'gemini_call_failed')
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** (attempt - 1))))
    } finally {
      clearTimeout(timer)
    }
  }
  return emptyResult('gemini_call_failed')
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

const FACE_SYSTEM_INSTRUCTION = `You assist a live face-liveness check for account signup on a teen-safe social app.
You are NOT performing identity recognition and must NEVER guess or report age, gender, ethnicity, or name.
Look only at whether the image plausibly shows a real live person in front of a camera right now.
Return ONLY a JSON object (no markdown, no prose) with this exact shape:
{
  "face_present": true|false,
  "single_face": true|false,
  "likely_live_camera_capture": true|false,
  "likely_photo_of_photo_or_screen": true|false,
  "confidence": 0-100,
  "explanation": "one short sentence, no demographic guesses"
}`

function emptyFaceResult(reason) {
  return {
    available: false,
    reason,
    face_present: false,
    single_face: false,
    likely_live_camera_capture: false,
    likely_photo_of_photo_or_screen: false,
    confidence: 0,
    explanation: reason,
  }
}

function parseFaceJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  return {
    available: true,
    face_present: !!parsed.face_present,
    single_face: !!parsed.single_face,
    likely_live_camera_capture: !!parsed.likely_live_camera_capture,
    likely_photo_of_photo_or_screen: !!parsed.likely_photo_of_photo_or_screen,
    confidence: Number(parsed.confidence) || 0,
    explanation: parsed.explanation || '',
  }
}

/**
 * Analyze a single captured camera frame for liveness signals during signup.
 * Deliberately never returns/derives age, gender, or identity — only a
 * present/live/confidence signal used to gate account creation.
 * @param {{ base64, mimeType }} image
 */
export async function analyzeFaceLiveness(image) {
  if (!image?.base64) return emptyFaceResult('no_image')
  if (!GEMINI_API_KEY) return emptyFaceResult('gemini_api_key_not_configured')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: FACE_SYSTEM_INSTRUCTION }] },
        contents: [{
          role: 'user',
          parts: [
            { text: 'Assess this camera frame for the liveness check.' },
            { inline_data: { mime_type: image.mimeType || 'image/jpeg', data: image.base64 } },
          ],
        }],
        safetySettings: SAFETY_SETTINGS,
        generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 300 },
      }),
    })
    if (!res.ok) return emptyFaceResult(`gemini_http_${res.status}`)
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return emptyFaceResult('gemini_empty_response')
    return parseFaceJson(text)
  } catch (err) {
    return emptyFaceResult(err.name === 'AbortError' ? 'gemini_timeout' : 'gemini_call_failed')
  } finally {
    clearTimeout(timer)
  }
}

export { CATEGORIES as GEMINI_CATEGORIES }
