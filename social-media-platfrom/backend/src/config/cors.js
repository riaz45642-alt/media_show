const DEPLOYED_FRONTEND_ORIGIN = 'https://media-show.pages.dev'

function normalizeOrigin(value) {
  try {
    const url = new URL(value.trim())
    return url.origin
  } catch {
    return null
  }
}

export function getAllowedOrigins() {
  const configured = process.env.CLIENT_URLS || process.env.CLIENT_URL || ''
  const origins = configured.split(',').map(normalizeOrigin).filter(Boolean)

  if (process.env.NODE_ENV === 'production') {
    origins.push(DEPLOYED_FRONTEND_ORIGIN)
  } else {
    origins.push('http://localhost:5173', 'http://127.0.0.1:5173')
  }
  return [...new Set(origins)]
}

export function originIsAllowed(origin) {
  return !origin || getAllowedOrigins().includes(normalizeOrigin(origin))
}

export function corsOriginCallback(origin, callback) {
  if (originIsAllowed(origin)) return callback(null, true)
  const error = new Error(`Origin is not allowed by CORS: ${origin}`)
  error.status = 403
  callback(error)
}
