import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import multer from 'multer'

export const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'))
fs.mkdirSync(uploadDirectory, { recursive: true })

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
