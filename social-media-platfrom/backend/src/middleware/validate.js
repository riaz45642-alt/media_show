// Small, dependency-free validation helpers. Keeps the backend's declared
// dependencies untouched while still giving every route real input
// validation instead of trusting whatever the client sends.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value.trim())
}

/**
 * Build an Express middleware that validates req.body against a small rule
 * set and responds 400 with a clear message on the first failure, instead
 * of letting bad input reach the database layer.
 *
 * rules: { fieldName: { required, type, minLength, maxLength, min, max, email } }
 */
export function validateBody(rules) {
  return (req, res, next) => {
    const errors = []
    const body = req.body || {}

    for (const [field, rule] of Object.entries(rules)) {
      const value = body[field]
      const present = value !== undefined && value !== null && value !== ''

      if (rule.required && !present) {
        errors.push(`${field} is required`)
        continue
      }
      if (!present) continue

      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`)
        continue
      }
      if (rule.type === 'number' && Number.isNaN(Number(value))) {
        errors.push(`${field} must be a number`)
        continue
      }

      if (rule.type === 'string') {
        const trimmed = value.trim()
        if (rule.minLength && trimmed.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`)
        }
        if (rule.maxLength && trimmed.length > rule.maxLength) {
          errors.push(`${field} must be at most ${rule.maxLength} characters`)
        }
        // Normalize whitespace-only / stray-spacing input in place.
        body[field] = trimmed
      }

      if (rule.type === 'number') {
        const num = Number(value)
        if (rule.min !== undefined && num < rule.min) errors.push(`${field} must be at least ${rule.min}`)
        if (rule.max !== undefined && num > rule.max) errors.push(`${field} must be at most ${rule.max}`)
      }

      if (rule.email && !isEmail(value)) {
        errors.push(`${field} must be a valid email address`)
      }

      if (rule.oneOf && !rule.oneOf.includes(value)) {
        errors.push(`${field} must be one of: ${rule.oneOf.join(', ')}`)
      }
    }

    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors })
    }
    next()
  }
}
