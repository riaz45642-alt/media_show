import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { moderateMediaWithSightengine, SIGHTENGINE_REJECTION_THRESHOLD, SIGHTENGINE_SUGGESTIVE_REJECTION_THRESHOLD } from './sightengineService.js'
import { analyzeChildIntimacyWithGemini } from './geminiService.js'

const CACHE_TTL_MS = Number(process.env.MEDIA_MODERATION_CACHE_TTL_MS || 24 * 60 * 60 * 1000)
const CACHE_MAX_ENTRIES = Number(process.env.MEDIA_MODERATION_CACHE_MAX_ENTRIES || 500)
const decisionCache = new Map()
export function shouldRunSecondAiCheck(sightengineResult) {
  return Boolean(sightengineResult?.available && sightengineResult.safe)
}

export function combineModerationDecisions(sightengineResult, aiResult) {
  if (!sightengineResult?.available || !sightengineResult.safe) {
    return {
      ...sightengineResult,
      rejectedBy: sightengineResult?.safe === false ? 'Sightengine' : null,
      moderationProvider: 'Sightengine',
    }
  }
  if (aiResult == null) return sightengineResult
  // The secondary provider is deliberately fail-open to Sightengine's valid
  // safe decision. Provider downtime must never crash uploads or become HTTP 500.
  if (!aiResult?.available) {
    return {
      ...sightengineResult,
      secondaryModeration: { provider: 'AI Vision', available: false, reason: aiResult?.reason || 'provider_unavailable' },
    }
  }
  if (aiResult.safe === false) {
    return {
      available: true,
      safe: false,
      confidence: Math.max(Number(sightengineResult.confidence) || 0, Number(aiResult.confidence) || 0),
      reason: aiResult.reason || 'AI Vision detected content inappropriate for children.',
      categories: [...new Set(aiResult.categories || [])],
      modelCategories: sightengineResult.modelCategories,
      rejectedBy: sightengineResult.safe === false ? 'Both' : 'AI Vision',
      moderationProvider: 'AI Vision',
      secondaryModeration: { provider: 'AI Vision', available: true },
    }
  }
  return {
    ...sightengineResult,
    secondaryModeration: { provider: 'AI Vision', available: true, safe: true },
  }
}

async function runHybridModeration(file) {
  console.info(JSON.stringify({
    level: 'info', event: 'media_moderation_started', fileName: file.originalname,
    mediaType: file.mimetype, byteSize: file.size,
    pipeline: file.mimetype.startsWith('video/') ? 'sightengine_video_then_gemini_native_video' : 'sightengine_image_then_gemini_image',
  }))
  const sightengineResult = await moderateMediaWithSightengine(file)
  if (!shouldRunSecondAiCheck(sightengineResult)) return combineModerationDecisions(sightengineResult, null)

  console.info(JSON.stringify({
    level: 'info', event: 'second_ai_moderation_started', provider: 'gemini',
    fileName: file.originalname, mediaType: file.mimetype,
    sightengineConfidence: sightengineResult.confidence,
    threshold: SIGHTENGINE_REJECTION_THRESHOLD,
    suggestiveThreshold: SIGHTENGINE_SUGGESTIVE_REJECTION_THRESHOLD,
    reviewCategories: sightengineResult.reviewCategories || [],
  }))
  let aiResult
  try {
    const base64 = (await fs.readFile(file.path)).toString('base64')
    console.info(JSON.stringify({
      level: 'info', event: 'gemini_native_media_request', fileName: file.originalname,
      mediaType: file.mimetype, requestMediaType: file.mimetype.startsWith('video/') ? 'native_video' : 'image',
      byteSize: file.size,
    }))
    aiResult = await analyzeChildIntimacyWithGemini({ base64, mimeType: file.mimetype })
  } catch (error) {
    aiResult = { available: false, safe: null, confidence: null, categories: [], reason: 'second_ai_check_failed' }
    console.error(JSON.stringify({
      level: 'error', event: 'second_ai_moderation_failed', provider: 'gemini',
      fileName: file.originalname, mediaType: file.mimetype,
      error: { name: error.name, code: error.code, message: error.message },
    }))
  }
  const finalResult = combineModerationDecisions(sightengineResult, aiResult)
  console.info(JSON.stringify({
    level: 'info', event: 'second_ai_moderation_completed', provider: 'gemini',
    fileName: file.originalname, mediaType: file.mimetype,
    aiAvailable: Boolean(aiResult.available), aiSafe: aiResult.safe,
    aiConfidence: aiResult.confidence, rejectedBy: finalResult.rejectedBy,
    finalSafe: finalResult.safe,
  }))
  console.info(JSON.stringify({
    level: 'info', event: 'hybrid_moderation_final_decision',
    fileName: file.originalname, mediaType: file.mimetype,
    sightengineScore: sightengineResult.confidence,
    sightengineReviewCategories: sightengineResult.reviewCategories || [],
    geminiResult: aiResult,
    finalDecision: { safe: finalResult.safe, confidence: finalResult.confidence, reason: finalResult.reason },
    rejectedBy: finalResult.rejectedBy || null,
  }))
  return finalResult
}

function getCached(hash) {
  const cached = decisionCache.get(hash)
  if (!cached || cached.expiresAt <= Date.now()) {
    decisionCache.delete(hash)
    return null
  }
  return { ...cached.result, cached: true }
}

function setCached(hash, result) {
  if (decisionCache.size >= CACHE_MAX_ENTRIES) {
    decisionCache.delete(decisionCache.keys().next().value)
  }
  decisionCache.set(hash, { result, expiresAt: Date.now() + CACHE_TTL_MS })
}

async function sha256(filePath) {
  const bytes = await fs.readFile(filePath)
  return crypto.createHash('sha256').update(bytes).digest('hex')
}

function logDecision({ file, result, processingTimeMs, frameCount = 1 }) {
  console.info(JSON.stringify({
    level: 'info',
    event: 'media_moderation_completed',
    fileName: file.originalname,
    mediaType: file.mimetype,
    categories: result.categories,
    modelCategories: result.modelCategories,
    confidence: result.confidence,
    safe: result.safe,
    reason: result.reason,
    decisionReason: result.decisionReason,
    rejectedBy: result.rejectedBy,
    moderationProvider: result.moderationProvider,
    secondaryModeration: result.secondaryModeration,
    cached: Boolean(result.cached),
    frameCount,
    processingTimeMs,
  }))
}

export async function moderateUploadedFile(file) {
  const startedAt = Date.now()
  let hash = ''
  let result
  try {
    hash = await sha256(file.path)
    result = getCached(hash)
    if (!result) {
      result = await runHybridModeration(file)
      if (result.available) setCached(hash, result)
    }
  } catch (error) {
    result = {
      available: false,
      safe: null,
      reason: file.mimetype.startsWith('video/')
        ? 'Video could not be analyzed. Please use a valid MP4 or WebM file.'
        : 'Image could not be analyzed. Please use a valid supported image.',
      categories: [],
      confidence: null,
    }
    console.error(JSON.stringify({
      level: 'error',
      event: 'media_moderation_failed',
      fileName: file.originalname,
      mediaType: file.mimetype,
      error: error.message,
      processingTimeMs: Date.now() - startedAt,
    }))
  }
  logDecision({ file, result, processingTimeMs: Date.now() - startedAt, frameCount: result.frameCount || 1 })
  return { ...result, fileName: file.originalname, mediaType: file.mimetype, hash }
}

export async function moderateUploadedMedia(files = []) {
  return Promise.all(files.map(moderateUploadedFile))
}
