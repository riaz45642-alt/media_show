import fs from 'node:fs'
import axios from 'axios'
import FormData from 'form-data'

export const SIGHTENGINE_IMAGE_ENDPOINT = 'https://api.sightengine.com/1.0/check.json'
export const SIGHTENGINE_VIDEO_ENDPOINT = 'https://api.sightengine.com/1.0/video/check-sync.json'
export const SIGHTENGINE_MODELS = 'nudity-2.1,gore-2.0,weapon,violence,recreational_drug,offensive'

const configuredThreshold = Number(process.env.MEDIA_REJECTION_CONFIDENCE)
export const SIGHTENGINE_REJECTION_THRESHOLD = Number.isFinite(configuredThreshold)
  ? Math.max(0.05, Math.min(1, configuredThreshold))
  : 0.35
const configuredSuggestiveThreshold = Number(process.env.MEDIA_SUGGESTIVE_REJECTION_CONFIDENCE)
export const SIGHTENGINE_SUGGESTIVE_REJECTION_THRESHOLD = Number.isFinite(configuredSuggestiveThreshold)
  ? Math.max(SIGHTENGINE_REJECTION_THRESHOLD, Math.min(1, configuredSuggestiveThreshold))
  : 0.60

function unavailable(reason, providerError = null, details = {}) {
  return { available: false, safe: null, confidence: null, reason, categories: [], ...details, ...(providerError ? { providerError } : {}) }
}

function log(event, details, level = 'info') {
  const writer = level === 'error' ? console.error : console.info
  writer(JSON.stringify({ level, event, ...details }))
}

// Preserve the complete provider payload while ensuring a provider can never
// accidentally echo a credential into application logs.
function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    /api_secret|secret|authorization/i.test(key) ? '[REDACTED]' : redactSecrets(item),
  ]))
}

function numericLeaves(value, prefix = '', output = []) {
  if (typeof value === 'number' && Number.isFinite(value)) output.push({ path: prefix.toLowerCase(), score: value })
  else if (Array.isArray(value)) value.forEach((item, index) => numericLeaves(item, `${prefix}.${index}`, output))
  else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => numericLeaves(item, prefix ? `${prefix}.${key}` : key, output))
  }
  return output
}

const maxMatching = (leaves, include, exclude = /$a/) => leaves
  .filter(({ path }) => include.test(path) && !exclude.test(path))
  .reduce((maximum, { score }) => Math.max(maximum, score), 0)

function hasModerationData(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  if (Array.isArray(payload.data?.frames) && payload.data.frames.length > 0) return true
  return ['nudity', 'gore', 'weapon', 'violence', 'recreational_drug', 'offensive']
    .some((key) => payload[key] && typeof payload[key] === 'object')
}

function classifyMediaValidationFailure(payload, mediaType = '') {
  const message = String(payload?.error?.message || payload?.message || '').toLowerCase()
  const video = mediaType === 'video'
  if (video && /(duration|too long|longer than|60\s*seconds?|one minute|max(?:imum)? length)/i.test(message)) {
    return { validationError: true, code: 'VIDEO_DURATION_UNSUPPORTED', httpStatus: 422,
      userMessage: 'This video is too long for synchronous moderation. Please upload an MP4 or WebM video shorter than 60 seconds.' }
  }
  if (video && /(unsupported|format|codec|decode|corrupt|invalid video|cannot read|could not read|media type)/i.test(message)) {
    return { validationError: true, code: 'UNSUPPORTED_VIDEO_FORMAT', httpStatus: 415,
      userMessage: 'This video format or codec is not supported. Please upload a valid MP4 or WebM video.' }
  }
  if (/(too large|file size|payload too large|request entity too large|max(?:imum)? size)/i.test(message)) {
    return { validationError: true, code: video ? 'VIDEO_TOO_LARGE' : 'MEDIA_TOO_LARGE', httpStatus: 413,
      userMessage: video ? 'This video is too large. Please upload an MP4 or WebM file smaller than 50 MB.' : 'This media file is too large.' }
  }
  return null
}

function providerFailure(payload, context = {}) {
  const type = payload?.error?.type || 'provider_failure'
  const code = payload?.error?.code
  const message = payload?.error?.message || 'Sightengine could not analyze the media.'
  const validation = classifyMediaValidationFailure(payload, context.mediaType)
  return unavailable(`sightengine_${type}${code == null ? '' : `_${code}`}`, { type, code: code ?? null, message }, validation || {})
}

export function normalizeSightengineResponse(payload, context = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return unavailable('sightengine_malformed_response')
  }
  if (payload.status === 'failure' || payload.error) return providerFailure(payload, context)

  // Sightengine currently documents status="success", but accepting a valid
  // result object without that optional envelope prevents a successful result
  // from being misclassified as provider downtime.
  if (!hasModerationData(payload)) return unavailable('sightengine_missing_moderation_results')

  const leaves = numericLeaves(payload)
  const scores = {
    nudity: maxMatching(leaves, /nudity.*(sexual_display|explicit|visibly_undressed|sextoy)/, /none|context/),
    sexual_activity: maxMatching(leaves, /nudity.*sexual_activity/, /none|context/),
    erotica: maxMatching(leaves, /nudity.*erotica/, /none|context/),
    very_suggestive: maxMatching(leaves, /nudity.*very_suggestive/, /none|context/),
    suggestive: maxMatching(leaves, /nudity.*(suggestive|lingerie|suggestive_pose|suggestive_focus|very_revealing)/, /mildly_suggestive|none|context|very_suggestive/),
    gore: maxMatching(leaves, /gore|blood|corpse|wound|self_harm/, /none|safe/),
    weapon: maxMatching(leaves, /weapon|firearm|gun|knife/, /none|safe/),
    violence: maxMatching(leaves, /violence|physical_violence|threat/, /none|safe/),
    drugs: maxMatching(leaves, /recreational_drug|drug|cannabis|cocaine|heroin|narcotic/, /none|safe/),
    offensive: maxMatching(leaves, /offensive|nazi|confederate|supremacist|terrorist|middle_finger|hate/, /none|safe/),
  }
  // Appearance-only signals are evidence for secondary review, not proof of
  // prohibited content. Dark/high-contrast photos and ordinary portraits can
  // score highly as suggestive or very_suggestive. Only explicit/severe
  // categories may reject at this stage; Gemini verifies the warning signals.
  const secondaryReviewScores = {
    suggestive: scores.suggestive,
    very_suggestive: scores.very_suggestive,
  }
  const categories = Object.entries(scores)
    .filter(([category, score]) => !Object.hasOwn(secondaryReviewScores, category)
      && score >= SIGHTENGINE_REJECTION_THRESHOLD)
    .map(([category]) => category)
  const reviewCategories = Object.entries(secondaryReviewScores)
    .filter(([, score]) => score >= SIGHTENGINE_REJECTION_THRESHOLD)
    .map(([category]) => category)
  const confidence = Math.max(0, ...Object.values(scores))
  return {
    available: true,
    safe: categories.length === 0,
    confidence,
    reason: categories.length ? `High-confidence prohibited content detected: ${categories.join(', ')}` : '',
    categories,
    reviewCategories,
    requiresSecondaryReview: reviewCategories.length > 0,
    modelCategories: scores,
    moderationProvider: 'Sightengine',
    rejectedBy: categories.length ? 'Sightengine' : null,
  }
}

export function interpretSightengineHttpResponse(status, payload, context = {}) {
  if (!Number.isInteger(status) || status < 200 || status >= 300) {
    const failure = providerFailure(payload, context)
    return unavailable(`sightengine_http_${status || 'unknown'}_${failure.reason.replace(/^sightengine_/, '')}`, failure.providerError, {
      ...(failure.validationError ? {
        validationError: true, code: failure.code, httpStatus: failure.httpStatus, userMessage: failure.userMessage,
      } : {}),
    })
  }
  return normalizeSightengineResponse(payload, context)
}

export function normalizeSightengineRequestError(error, context = {}) {
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT' || /timeout/i.test(error?.message || '')) {
    return unavailable('sightengine_timeout')
  }
  if (error?.response) return interpretSightengineHttpResponse(error.response.status, error.response.data, context)
  return unavailable('sightengine_request_failed', {
    type: error?.name || 'Error', code: error?.code || null, message: error?.message || 'Unknown request error',
  })
}

export async function moderateMediaWithSightengine(file) {
  const isVideo = file.mimetype.startsWith('video/')
  const endpoint = isVideo ? SIGHTENGINE_VIDEO_ENDPOINT : SIGHTENGINE_IMAGE_ENDPOINT
  const context = {
    endpoint,
    models: SIGHTENGINE_MODELS,
    apiUserPresent: Boolean(process.env.SIGHTENGINE_API_USER),
    apiSecretPresent: Boolean(process.env.SIGHTENGINE_API_SECRET),
    fileName: file.originalname,
    mediaType: file.mimetype,
    requestMediaType: isVideo ? 'video' : 'image',
    byteSize: file.size,
    multipartField: 'media',
  }
  log('sightengine_request', context)

  if (!context.apiUserPresent || !context.apiSecretPresent) {
    const result = unavailable('sightengine_credentials_not_configured')
    log('sightengine_final_decision', { ...context, normalized: result }, 'error')
    return result
  }

  const form = new FormData()
  form.append('media', fs.createReadStream(file.path), { filename: file.originalname, contentType: file.mimetype })
  form.append('models', SIGHTENGINE_MODELS)
  form.append('api_user', process.env.SIGHTENGINE_API_USER)
  form.append('api_secret', process.env.SIGHTENGINE_API_SECRET)

  try {
    const response = await axios.post(endpoint, form, {
      // Sightengine recommends at least 60 seconds for synchronous video
      // analysis. Images keep a shorter bound; video gets two minutes.
      headers: form.getHeaders(), timeout: isVideo ? 120000 : 30000,
      maxBodyLength: Infinity, maxContentLength: Infinity,
      validateStatus: () => true,
    })
    log('sightengine_http_response', { ...context, httpStatus: response.status, contentType: response.headers?.['content-type'] })
    log('sightengine_raw_response', { ...context, httpStatus: response.status, payload: redactSecrets(response.data) }, response.status >= 400 ? 'error' : 'info')
    const normalized = interpretSightengineHttpResponse(response.status, response.data, { mediaType: context.requestMediaType })
    log('sightengine_normalized_response', { ...context, normalized }, normalized.available ? 'info' : 'error')
    log('sightengine_final_decision', { ...context, decision: normalized }, normalized.available && normalized.safe ? 'info' : 'error')
    return normalized
  } catch (error) {
    const normalized = normalizeSightengineRequestError(error, { mediaType: context.requestMediaType })
    log('sightengine_http_response', { ...context, httpStatus: error.response?.status ?? null, requestError: { name: error.name, code: error.code, message: error.message } }, 'error')
    log('sightengine_raw_response', { ...context, httpStatus: error.response?.status ?? null, payload: redactSecrets(error.response?.data ?? null) }, 'error')
    log('sightengine_normalized_response', { ...context, normalized }, 'error')
    log('sightengine_final_decision', { ...context, decision: normalized }, 'error')
    return normalized
  }
}
