import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authenticated' })
  try {
    const token = header.split(' ')[1]
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || 'media-show-api',
      audience: process.env.JWT_AUDIENCE || 'media-show-web',
    })
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}
