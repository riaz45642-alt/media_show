// Google Gemini integration for context-aware content moderation.
// Uses global fetch (Node 18+) so no extra dependency is required.
// If GEMINI_API_KEY is not configured, calls resolve to a neutral "unknown"
// result rather than throwing, so the rest of the pipeline (rule-based +
// human review) keeps the platform usable without the key configured.

const normalizeModelName = (value = '') => value.trim()
  .replace(/^models\//i, '')
  .replace(/:generateContent$/i, '')
const GEMINI_MODEL = normalizeModelName(process.env.GEMINI_MODEL) || 'gemini-flash-latest'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta'
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 3
let resolvedModel = GEMINI_MODEL

const endpointFor = (model) => `${API_ROOT}/models/${encodeURIComponent(normalizeModelName(model))}:generateContent`

async function discoverGenerateContentModel(signal, excludedModel) {
  const response = await fetch(`${API_ROOT}/models?pageSize=1000`, {
    headers: { 'x-goog-api-key': GEMINI_API_KEY }, signal,
  })
  if (!response.ok) return null
  const data = await response.json()
  const supported = (data.models || []).filter((model) =>
    model.supportedGenerationMethods?.includes('generateContent')
    && normalizeModelName(model.name) !== excludedModel)
  const preferred = supported.find((model) => /gemini-flash-latest$/i.test(model.name))
    || supported.find((model) => /gemini-3.*flash$/i.test(model.name))
    || supported.find((model) => /gemini-2\.0-flash$/i.test(model.name))
    || supported.find((model) => /gemini-.*flash$/i.test(model.name))
  return preferred ? normalizeModelName(preferred.name) : null
}

async function postGemini(body, signal) {
  let response = await fetch(endpointFor(resolvedModel), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    signal,
    body: JSON.stringify(body),
  })
  if (![404, 429].includes(response.status)) return response

  // The stable 2.x models may be retired for newer accounts or have a
  // separate exhausted quota while the provider's current Flash alias works.
  // Try the official latest alias before falling back to model discovery.
  if (resolvedModel !== 'gemini-flash-latest') {
    const aliasResponse = await fetch(endpointFor('gemini-flash-latest'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      signal,
      body: JSON.stringify(body),
    })
    if (aliasResponse.ok || ![404, 429].includes(aliasResponse.status)) {
      console.warn(JSON.stringify({
        level: 'warn', event: 'gemini_model_fallback', configuredModel: GEMINI_MODEL, resolvedModel: 'gemini-flash-latest',
      }))
      resolvedModel = 'gemini-flash-latest'
      return aliasResponse
    }
    response = aliasResponse
  }

  const discovered = await discoverGenerateContentModel(signal, resolvedModel)
  if (!discovered || discovered === resolvedModel) return response
  console.warn(JSON.stringify({
    level: 'warn', event: 'gemini_model_fallback', configuredModel: GEMINI_MODEL, resolvedModel: discovered,
  }))
  resolvedModel = discovered
  response = await fetch(endpointFor(resolvedModel), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    signal,
    body: JSON.stringify(body),
  })
  return response
}

export const MEDIA_MODERATION_CATEGORIES = Object.freeze([
  'sexual', 'nudity', 'pornography', 'adult_content', 'explicit_body_exposure',
  'sexually_suggestive_swimwear', 'lingerie', 'erotic_pose', 'violence', 'blood',
  'gore', 'dead_body', 'serious_injury', 'torture', 'animal_cruelty', 'weapon',
  'gun', 'rifle', 'explosive', 'bomb', 'violent_knife_use', 'drugs', 'cocaine',
  'marijuana', 'heroin', 'pills', 'drug_consumption', 'self_harm', 'suicide',
  'cutting', 'hanging', 'dangerous_self_injury', 'hate_symbol', 'nazi_symbol',
  'racist_content', 'terrorist_imagery', 'criminal_activity', 'human_trafficking',
  'child_abuse', 'child_exploitation', 'gambling', 'alcohol_abuse', 'smoking',
  'offensive_gesture', 'adult_advertisement', 'illegal_activity',
])

const MEDIA_SYSTEM_INSTRUCTION = `You are a calibrated visual safety classifier for a family-friendly social media platform used by children and teenagers.
Analyze the supplied image or extracted video frame. Detect nudity, pornography, sexual content, explicit body exposure, sexually suggestive bikini/lingerie imagery, erotic poses, violence, blood, gore, dead bodies, serious injuries, torture, animal cruelty, weapons, guns, rifles, explosives, bombs, knives used violently, drugs and drug consumption, self-harm, suicide attempts, cutting, hanging, dangerous self-injury, hate or Nazi symbols, racist or terrorist content, criminal activity, human trafficking, child abuse or exploitation, gambling, alcohol abuse, smoking, offensive gestures, adult advertisements, and illegal activities.
Return ONLY JSON matching the response schema. Set safe=false only for clearly prohibited content that is visibly present. Confidence is confidence in the unsafe classification, not general image-recognition confidence.
Ordinary nature, mountains, beaches, forests, landscapes, animals, buildings, vehicles, food, family photos, sports, technology, daily life, cartoons, fictional characters, and superheroes (including Batman) are safe unless clearly explicit or graphically violent. A costume, dark visual style, exposed non-intimate skin, ordinary swimwear, a fictional weapon, or an action pose alone is not sufficient for an unsafe decision. Do not identify people or infer protected personal attributes.`

const MEDIA_MODERATION_SCHEMA = {
  type: 'OBJECT',
  required: ['safe', 'reason', 'categories', 'confidence'],
  properties: {
    safe: { type: 'BOOLEAN' },
    reason: { type: 'STRING' },
    categories: {
      type: 'ARRAY',
      items: { type: 'STRING', enum: MEDIA_MODERATION_CATEGORIES },
    },
    confidence: { type: 'NUMBER', minimum: 0, maximum: 1 },
  },
}

const SAFETY_SETTINGS = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_MEDIUM_AND_ABOVE' }))
const MEDIA_SAFETY_SETTINGS = SAFETY_SETTINGS.map(({ category }) => ({ category, threshold: 'BLOCK_ONLY_HIGH' }))

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
Higher scores mean more severe/unsafe. Consider sarcasm, context, and reclaimed language rather than flagging on keywords alone.
Calibration requirements:
- Ordinary greetings, names, introductions, neutral conversation, and benign everyday language are safe.
- "Hello", "Ahmed", "Hi there", and similar harmless text must score 0-5 overall with no primary concern.
- Do not infer sexual, violent, or hateful meaning when it is not explicitly present.
- A non-null primary concern must correspond to a category score of at least 31.`

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
  const highest = Math.max(...Object.values(categories))
  if (highest === 0) return emptyResult(`gemini_blocked_${promptBlocked || candidate?.finishReason || 'unknown'}`)
  return {
    available: true,
    reason: 'gemini_safety_block',
    categories,
    overall_score: highest,
    primary_concern: Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
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
      const res = await postGemini({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts }],
          safetySettings: SAFETY_SETTINGS,
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: MODERATION_SCHEMA,
            maxOutputTokens: 1200,
          },
        }, controller.signal)
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

export function unavailableMediaResult(reason) {
  return { available: false, safe: null, reason, categories: [], confidence: null }
}

export function parseMediaJson(text) {
  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
  const categories = Array.isArray(parsed.categories)
    ? parsed.categories.filter((category) => MEDIA_MODERATION_CATEGORIES.includes(category))
    : []
  if (typeof parsed.safe !== 'boolean') throw new TypeError('Gemini media response safe must be boolean')
  if (!Number.isFinite(Number(parsed.confidence))) throw new TypeError('Gemini media response confidence must be numeric')
  return {
    available: true,
    safe: parsed.safe,
    reason: String(parsed.reason || ''),
    categories,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
  }
}

const configuredMediaThreshold = Number(process.env.MEDIA_REJECTION_CONFIDENCE)
export const MEDIA_REJECTION_CONFIDENCE = Number.isFinite(configuredMediaThreshold)
  ? Math.max(0.5, Math.min(1, configuredMediaThreshold))
  : 0.85
const CLEARLY_PROHIBITED_MEDIA_CATEGORIES = new Set([
  'sexual', 'nudity', 'pornography', 'adult_content', 'explicit_body_exposure',
  'child_abuse', 'child_exploitation', 'gore', 'dead_body', 'serious_injury',
  'torture', 'self_harm', 'suicide', 'cutting', 'hanging', 'dangerous_self_injury',
])

export function decideMediaModeration(parsed) {
  if (!parsed?.available) return parsed
  const prohibitedCategories = parsed.categories.filter((category) => CLEARLY_PROHIBITED_MEDIA_CATEGORIES.has(category))
  const reject = parsed.safe === false
    && parsed.confidence >= MEDIA_REJECTION_CONFIDENCE
    && prohibitedCategories.length > 0
  return {
    ...parsed,
    safe: !reject,
    reason: reject ? (parsed.reason || 'Clearly prohibited visual content detected.') : '',
    categories: reject ? prohibitedCategories : [],
    modelSafe: parsed.safe,
    modelCategories: parsed.categories,
    decisionReason: reject
      ? `high_confidence_prohibited_category_${parsed.confidence}`
      : parsed.safe === false
        ? `accepted_below_or_outside_rejection_policy_${parsed.confidence}`
        : 'model_classified_safe',
  }
}

async function callGeminiMedia(parts, timeoutMs = 15000) {
  if (!GEMINI_API_KEY) return unavailableMediaResult('gemini_api_key_not_configured')

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await postGemini({
          system_instruction: { parts: [{ text: MEDIA_SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts }],
          safetySettings: MEDIA_SAFETY_SETTINGS,
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: MEDIA_MODERATION_SCHEMA,
            maxOutputTokens: 500,
          },
        }, controller.signal)
      if (!response.ok) {
        if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** (attempt - 1))))
          continue
        }
        return unavailableMediaResult(`gemini_http_${response.status}`)
      }
      const data = await response.json()
      console.info(JSON.stringify({ level: 'info', event: 'gemini_media_raw_response', model: resolvedModel, attempt, response: data }))
      if (data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason === 'SAFETY') {
        const reason = `gemini_safety_block_${data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason}`
        console.warn(JSON.stringify({ level: 'warn', event: 'gemini_media_unstructured_safety_block', model: resolvedModel, reason, safetyRatings: data?.promptFeedback?.safetyRatings || data?.candidates?.[0]?.safetyRatings || [] }))
        return unavailableMediaResult(reason)
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) return unavailableMediaResult('gemini_empty_response')
      try {
        const parsed = parseMediaJson(text)
        console.info(JSON.stringify({ level: 'info', event: 'gemini_media_parsed_response', model: resolvedModel, parsed }))
        const decision = decideMediaModeration(parsed)
        console.info(JSON.stringify({ level: 'info', event: 'gemini_media_final_decision', model: resolvedModel, decision }))
        return decision
      } catch (parseError) {
        console.error(JSON.stringify({ level: 'error', event: 'gemini_media_parse_failed', model: resolvedModel, rawText: text, error: { name: parseError.name, message: parseError.message, stack: parseError.stack } }))
        return unavailableMediaResult('gemini_invalid_json_response')
      }
    } catch (error) {
      if (attempt === MAX_ATTEMPTS || error.name === 'AbortError') {
        return unavailableMediaResult(error.name === 'AbortError' ? 'gemini_timeout' : 'gemini_call_failed')
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** (attempt - 1))))
    } finally {
      clearTimeout(timer)
    }
  }
  return unavailableMediaResult('gemini_call_failed')
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

/** Strict family-safety decision for one uploaded image or extracted video frame. */
export async function analyzeMediaFrameWithGemini({ base64, mimeType = 'image/jpeg' } = {}) {
  if (!base64) return unavailableMediaResult('no_media_data')
  return callGeminiMedia([
    { text: 'Analyze this uploaded media frame for family-friendly safety.' },
    { inline_data: { mime_type: mimeType, data: base64 } },
  ])
}

export { CATEGORIES as GEMINI_CATEGORIES }
