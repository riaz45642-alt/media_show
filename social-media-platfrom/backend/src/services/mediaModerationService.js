import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'
import { analyzeMediaFrameWithGemini } from './geminiService.js'

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

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('FFmpeg binary is unavailable'))
    const child = spawn(ffmpegPath, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += chunk.toString().slice(-2000) })
    child.on('error', reject)
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`)))
  })
}

async function extractVideoFrames(filePath) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'media-show-frames-'))
  const pattern = path.join(directory, 'frame-%02d.jpg')
  try {
    await runFfmpeg([
      '-hide_banner', '-loglevel', 'error', '-i', filePath,
      '-vf', 'fps=1/5,scale=960:-2:force_original_aspect_ratio=decrease',
      '-frames:v', '10', '-q:v', '3', pattern,
    ])
    const names = (await fs.readdir(directory)).filter((name) => name.endsWith('.jpg')).sort()
    if (!names.length) throw new Error('No video frames could be extracted')
    return {
      directory,
      frames: names.map((name) => path.join(directory, name)),
    }
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true })
    throw error
  }
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

async function moderateImage(file) {
  const base64 = (await fs.readFile(file.path)).toString('base64')
  return analyzeMediaFrameWithGemini({ base64, mimeType: file.mimetype })
}

async function moderateVideo(file) {
  const extracted = await extractVideoFrames(file.path)
  try {
    const decisions = await Promise.all(extracted.frames.map(async (framePath) =>
      analyzeMediaFrameWithGemini({
        base64: (await fs.readFile(framePath)).toString('base64'),
        mimeType: 'image/jpeg',
      })
    ))
    const unavailable = decisions.find((decision) => !decision.available)
    if (unavailable) return { ...unavailable, frameCount: decisions.length }
    const unsafe = decisions.find((decision) => !decision.safe)
    return { ...(unsafe || { available: true, safe: true, reason: '', categories: [], confidence: Math.min(...decisions.map((item) => item.confidence)) }), frameCount: decisions.length }
  } finally {
    await fs.rm(extracted.directory, { recursive: true, force: true })
  }
}

export async function moderateUploadedFile(file) {
  const startedAt = Date.now()
  let hash = ''
  let result
  try {
    hash = await sha256(file.path)
    result = getCached(hash)
    if (!result) {
      result = file.mimetype.startsWith('video/') ? await moderateVideo(file) : await moderateImage(file)
      if (result.available) setCached(hash, result)
    }
  } catch (error) {
    result = {
      available: false,
      safe: false,
      reason: file.mimetype.startsWith('video/')
        ? 'Video could not be analyzed. Please use a valid MP4 or WebM file.'
        : 'Image could not be analyzed. Please use a valid supported image.',
      categories: [],
      confidence: 0,
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
