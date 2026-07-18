// Minimal in-memory rate limiter. Good enough for a single-process API and
// avoids adding a new dependency just for basic brute-force protection on
// auth endpoints. For a multi-instance deployment, swap this for a
// Redis-backed limiter.

const buckets = new Map()

export function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`
    const now = Date.now()
    const bucket = buckets.get(key)

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (bucket.count >= max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000)
      res.setHeader('Retry-After', String(retryAfterSec))
      return res.status(429).json({ message: 'Too many requests, please try again shortly.' })
    }

    bucket.count += 1
    next()
  }
}

// Periodically sweep expired buckets so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key)
  }
}, 5 * 60_000).unref?.()
