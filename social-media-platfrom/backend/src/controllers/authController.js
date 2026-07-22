import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { generateToken, generateFaceVerificationToken, verifyFaceVerificationToken } from '../utils/generateToken.js'
import { validateDisplayName } from '../services/ruleBasedFilter.js'
import { analyzeFaceLiveness } from '../services/geminiService.js'

const ALLOWED_GENDERS = new Set(['male', 'female', 'other', ''])

// POST /api/auth/verify-face — analyzes one live camera frame with Gemini
// vision purely for a face-present/liveness signal (never age, gender, or
// identity). The frame is used in-memory for this single check only; it is
// never persisted or logged. On success, returns a 10-minute token that
// signup() requires, so an account can only be created after this passed.
export async function verifyFace(req, res, next) {
  try {
    const { imageBase64, imageMimeType } = req.body
    if (!imageBase64) return res.status(400).json({ verified: false, message: 'imageBase64 is required' })

    const result = await analyzeFaceLiveness({ base64: imageBase64, mimeType: imageMimeType })

    if (!result.available) {
      // Gemini unreachable/unconfigured — don't hard-block signup on an
      // infra hiccup; the client-side liveness heuristic already ran before
      // this call, so fail open with a clearly-marked degraded pass and
      // still issue a token so signup can proceed.
      return res.json({ verified: true, degraded: true, reason: result.reason, token: generateFaceVerificationToken() })
    }

    const passed =
      result.face_present &&
      result.single_face &&
      result.likely_live_camera_capture &&
      !result.likely_photo_of_photo_or_screen &&
      result.confidence >= 55

    if (!passed) {
      return res.json({
        verified: false,
        reason: result.explanation || 'Could not confirm a live face in frame.',
      })
    }

    const token = generateFaceVerificationToken()
    res.json({ verified: true, token })
  } catch (err) {
    next(err)
  }
}

function ageGroupFor(age) {
  if (age < 13) return 'kids'
  if (age < 18) return 'teen'
  return 'adult'
}

export async function signup(req, res, next) {
  try {
    const { name, email, password, age, avatarUrl, gender, faceToken } = req.body

    const usernameCheck = validateDisplayName(name)
    if (!usernameCheck.valid) {
      return res.status(422).json({
        message: 'That name is not allowed',
        flags: usernameCheck.flags,
        suggestions: usernameCheck.suggestions,
      })
    }

    if (!faceToken) {
      return res.status(422).json({ message: 'Face verification is required before signup.' })
    }
    try {
      verifyFaceVerificationToken(faceToken)
    } catch {
      return res.status(422).json({ message: 'Face verification expired or is invalid. Please verify again.' })
    }

    // Gender, if provided, is saved exactly as the user chose it — face
    // verification above only confirms liveness and never touches this field.
    const safeGender = ALLOWED_GENDERS.has(gender) ? (gender || null) : null

    const passwordHash = await bcrypt.hash(password, 10)
    const ageGroup = ageGroupFor(Number(age))

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, age, age_group, avatar_url, gender, face_verified, face_verified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,now()) RETURNING id, name, email, age, age_group, avatar_url, gender, face_verified`,
      [name, email.toLowerCase(), passwordHash, age, ageGroup, avatarUrl || null, safeGender]
    )
    const user = rows[0]
    const token = generateToken({ id: user.id })
    res.status(201).json({ user, token })
  } catch (err) {
    // Postgres unique_violation — surface a clear message instead of a 500.
    if (err.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists' })
    }
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    const user = rows[0]
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })

    const token = generateToken({ id: user.id })
    delete user.password_hash
    res.json({ user, token })
  } catch (err) {
    next(err)
  }
}
