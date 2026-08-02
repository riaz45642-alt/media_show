import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import multer from 'multer'

function findWritableUploadDirectory() {
  const configured = process.env.UPLOAD_DIR?.trim()
  const candidates = [
    configured && path.resolve(configured),
    path.resolve(process.cwd(), 'uploads'),
    path.join(os.tmpdir(), 'media-show-uploads'),
  ].filter((candidate, index, all) => candidate && all.indexOf(candidate) === index)

  let lastError
  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true })
      fs.accessSync(candidate, fs.constants.W_OK)
      if (configured && candidate !== path.resolve(configured)) {
        console.warn(JSON.stringify({
          level: 'warn',
          event: 'upload_directory_fallback',
          configuredDirectory: configured,
          uploadDirectory: candidate,
        }))
      }
      return candidate
    } catch (error) {
      lastError = error
    }
  }

  const error = new Error('No writable upload directory is available', { cause: lastError })
  error.code = 'UPLOAD_DIRECTORY_UNAVAILABLE'
  throw error
}

// Render Free has an ephemeral but writable filesystem. UPLOAD_DIR is optional;
// when omitted, ./uploads is used. The OS temp directory is a final fallback.
export const uploadDirectory = findWritableUploadDirectory()

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
])

const logUploadCandidate = (req, file, accepted, reason = null) => console.info(JSON.stringify({
  level: 'info', event: 'upload_mime_checked', requestId: req.requestId, userId: req.user?.id,
  fileName: file.originalname, mimeType: file.mimetype, accepted, reason,
}))

function mediaFileFilter(req, file, callback) {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    logUploadCandidate(req, file, false, 'unsupported_mime_type')
    const error = new Error('Only JPEG, PNG, WebP, GIF, MP4, and WebM files are supported')
    error.status = 415
    error.code = 'UNSUPPORTED_MEDIA_TYPE'
    return callback(error)
  }
  logUploadCandidate(req, file, true)
  callback(null, true)
}

export function logUploadedMedia(req, _res, next) {
  const files = req.files || (req.file ? [req.file] : [])
  console.info(JSON.stringify({
    level: 'info', event: 'media_upload_received', requestId: req.requestId, userId: req.user?.id,
    fileCount: files.length,
    files: files.map((file) => ({ fileName: file.originalname, mimeType: file.mimetype, byteSize: file.size })),
  }))
  next()
}

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase() || `.${file.mimetype.split('/')[1]}`
    callback(null, `${crypto.randomUUID()}${extension}`)
  },
})

export const uploadPostMedia = multer({
  storage,
  limits: { files: 6, fileSize: 50 * 1024 * 1024 },
  fileFilter: mediaFileFilter,
}).array('media', 6)

export const uploadStoryMedia = multer({
  storage,
  limits: { files: 1, fileSize: 50 * 1024 * 1024 },
  fileFilter: mediaFileFilter,
}).single('media')

export const uploadAvatarMedia = multer({
  storage,
  limits: { files: 1, fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/') || !ALLOWED_TYPES.has(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, WebP, and GIF profile images are supported')
      error.status = 415
      return callback(error)
    }
    callback(null, true)
  },
}).single('avatar')
