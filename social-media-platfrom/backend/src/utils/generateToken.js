import jwt from 'jsonwebtoken'

export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'media-show-api',
    audience: process.env.JWT_AUDIENCE || 'media-show-web',
  })
}
