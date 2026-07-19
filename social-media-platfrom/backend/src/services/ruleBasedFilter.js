// Fast, dependency-free rule-based filter. Runs before any AI call so obvious
// abuse (injection attempts, spam, banned terms) is caught cheaply and never
// reaches Gemini. Returns a risk contribution (0-100) plus flags; a `blocked`
// result short-circuits the pipeline entirely (hard security violations).

const HATE_OFFENSIVE_WORDS = [
  'hate', 'stupid', 'idiot', 'dumb', 'ugly', 'kill yourself', 'kys',
  'retard', 'whore', 'slut', 'nazi', 'terrorist',
]

const DRUG_CRIME_EXTREMIST_TERMS = [
  'cocaine', 'heroin', 'meth lab', 'bomb making', 'jihad attack', 'mass shooting',
]

const SQLI_PATTERNS = [
  /(\bunion\b.{0,20}\bselect\b)/i,
  /(\bor\b\s+1\s*=\s*1)/i,
  /(--|;)\s*(drop|delete|update|insert)\b/i,
  /(\bdrop\s+table\b)/i,
]

const XSS_HTML_SCRIPT_PATTERNS = [
  /<script[\s>]/i,
  /on\w+\s*=\s*["']/i, // onerror=, onclick=, etc.
  /javascript:/i,
  /<iframe[\s>]/i,
  /<img[^>]+onerror/i,
]

const SUSPICIOUS_URL_PATTERNS = [
  /bit\.ly|tinyurl\.com|grabify|iplogger/i,
  /https?:\/\/[^\s]*@[^\s]+/i, // credential-embedded URLs
  /\d{1,3}(\.\d{1,3}){3}(?::\d+)?\//, // raw IP URLs
]

const recentSubmissions = new Map() // userId -> [{ text, ts }]
const SPAM_WINDOW_MS = 60_000
const SPAM_MAX_IN_WINDOW = 8

function containsAny(text, list) {
  const lower = text.toLowerCase()
  return list.filter((w) => lower.includes(w))
}

function countEmojis(text) {
  const matches = text.match(/\p{Extended_Pictographic}/gu)
  return matches ? matches.length : 0
}

function checkInjection(text) {
  const sql = SQLI_PATTERNS.some((r) => r.test(text))
  const xss = XSS_HTML_SCRIPT_PATTERNS.some((r) => r.test(text))
  return { sql, xss }
}

function checkFlooding(userId, text) {
  if (!userId) return { isSpammy: false, isDuplicate: false }
  const now = Date.now()
  const history = (recentSubmissions.get(userId) || []).filter((e) => now - e.ts < SPAM_WINDOW_MS)
  const isDuplicate = history.some((e) => e.text === text)
  const isSpammy = history.length >= SPAM_MAX_IN_WINDOW
  history.push({ text, ts: now })
  recentSubmissions.set(userId, history)
  return { isSpammy, isDuplicate }
}

/**
 * @param {{ text?: string, urls?: string[], userId?: string, contentType?: string }} input
 */
export function runRuleBasedFilter({ text = '', userId, contentType = 'post' } = {}) {
  const flags = []
  let riskPoints = 0
  let blocked = false
  let blockReason = null

  if (!text) return { blocked: false, riskPoints: 0, flags: [] }

  // --- Hard security blocks (never reach the AI layer) ---
  const injection = checkInjection(text)
  if (injection.sql) {
    blocked = true
    blockReason = 'sql_injection_attempt'
    flags.push('sql_injection')
  }
  if (injection.xss) {
    blocked = true
    blockReason = blockReason || 'script_or_html_injection_attempt'
    flags.push('xss_or_script_injection')
  }
  if (blocked) {
    return { blocked: true, blockReason, riskPoints: 100, flags }
  }

  // --- Length / flooding heuristics ---
  const maxLen = contentType === 'username' || contentType === 'displayName' ? 40 : 5000
  if (text.length > maxLen) {
    flags.push('oversized_content')
    riskPoints += 15
  }

  const { isSpammy, isDuplicate } = checkFlooding(userId, text)
  if (isSpammy) {
    flags.push('rapid_posting_flood')
    riskPoints += 30
  }
  if (isDuplicate) {
    flags.push('duplicate_content')
    riskPoints += 20
  }

  // --- Emoji / caps flooding ---
  const emojiCount = countEmojis(text)
  if (emojiCount > 12) {
    flags.push('excessive_emojis')
    riskPoints += 10
  }
  const letters = text.replace(/[^a-zA-Z]/g, '')
  if (letters.length > 15 && letters === letters.toUpperCase()) {
    flags.push('excessive_caps')
    riskPoints += 5
  }

  // --- Keyword lists ---
  const hateHits = containsAny(text, HATE_OFFENSIVE_WORDS)
  if (hateHits.length) {
    flags.push('offensive_or_hate_keyword')
    riskPoints += 25 * hateHits.length
  }
  const drugCrimeHits = containsAny(text, DRUG_CRIME_EXTREMIST_TERMS)
  if (drugCrimeHits.length) {
    flags.push('drug_crime_extremist_keyword')
    riskPoints += 35 * drugCrimeHits.length
  }

  // --- Links ---
  const urlMatches = text.match(/https?:\/\/\S+/gi) || []
  if (urlMatches.length) {
    const suspicious = urlMatches.some((u) => SUSPICIOUS_URL_PATTERNS.some((r) => r.test(u)))
    if (suspicious) {
      flags.push('suspicious_or_fake_url')
      riskPoints += 30
    }
  }

  return { blocked: false, riskPoints: Math.min(riskPoints, 100), flags }
}

/** Username-specific validation (format + banned terms), returns clean suggestions on failure. */
export function validateUsername(raw = '') {
  const name = raw.trim()
  const flags = []
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(name)) flags.push('invalid_username_format')
  const hits = containsAny(name, [...HATE_OFFENSIVE_WORDS, ...DRUG_CRIME_EXTREMIST_TERMS])
  if (hits.length) flags.push('offensive_username')

  if (!flags.length) return { valid: true }

  const base = name.replace(/[^a-zA-Z0-9]/g, '') || 'user'
  const suggestions = [`${base}${Math.floor(Math.random() * 900 + 100)}`, `the_${base}`, `${base}_official`]
  return { valid: false, flags, suggestions }
}

/** Looser check for free-text display names (unlike @usernames, spaces/unicode letters are fine). */
export function validateDisplayName(raw = '') {
  const name = raw.trim()
  const flags = []
  if (name.length < 2 || name.length > 60) flags.push('invalid_display_name_length')
  if (/<|>|\{|\}|https?:\/\//i.test(name)) flags.push('invalid_display_name_characters')
  const hits = containsAny(name, [...HATE_OFFENSIVE_WORDS, ...DRUG_CRIME_EXTREMIST_TERMS])
  if (hits.length) flags.push('offensive_display_name')

  if (!flags.length) return { valid: true }
  return { valid: false, flags, suggestions: [] }
}

/** Validates uploaded file metadata before any moderation call (type + size). */
export function validateUpload({ mimeType, sizeBytes, kind = 'image' } = {}) {
  const allowed = kind === 'video'
    ? ['video/mp4', 'video/webm', 'video/quicktime']
    : ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const maxBytes = kind === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024

  if (mimeType && !allowed.includes(mimeType)) {
    return { valid: false, reason: 'unsupported_file_type' }
  }
  if (sizeBytes && sizeBytes > maxBytes) {
    return { valid: false, reason: 'file_too_large' }
  }
  return { valid: true }
}
