import jwt from 'jsonwebtoken'

export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// Short-lived proof that /api/auth/verify-face passed for this browser
// session, required by /api/auth/signup before an account is created.
// Keeping it separate (own purpose claim + 10 min expiry) means it can only
// ever be used to gate signup, never as a general auth token.
export function generateFaceVerificationToken() {
  return jwt.sign({ purpose: 'face_verified' }, process.env.JWT_SECRET, { expiresIn: '10m' })
}

export function verifyFaceVerificationToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  if (decoded.purpose !== 'face_verified') throw new Error('invalid_token_purpose')
  return decoded
}
