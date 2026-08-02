import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { moderateMediaWithSightengine } from './sightengineService.js'

const CACHE_TTL_MS = Number(process.env.MEDIA_MODERATION_CACHE_TTL_MS || 24 * 60 * 60 * 1000)
const CACHE_MAX_ENTRIES = Number(process.env.MEDIA_MODERATION_CACHE_MAX_ENTRIES || 500)
const decisionCache = new Map()

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
      result = await moderateMediaWithSightengine(file)
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
