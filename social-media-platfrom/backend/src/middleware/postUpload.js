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
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, WebP, GIF, MP4, and WebM files are supported')
      error.status = 415
      return callback(error)
    }
    callback(null, true)
  },
}).array('media', 6)

export const uploadStoryMedia = multer({
  storage,
  limits: { files: 1, fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, WebP, GIF, MP4, and WebM files are supported')
      error.status = 415
      return callback(error)
    }
    callback(null, true)
  },
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
