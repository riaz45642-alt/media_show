import {
  BLOCKED_TERMS,
  EMBEDDED_IDENTIFIER_TERMS,
  IDENTIFIER_FALSE_POSITIVE_ALLOWLIST,
} from '../config/blockedTerms.js'

const LEET = Object.freeze({
  '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g',
  '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i', '+': 't',
})
const LETTER_SEPARATOR = '[\\s._*~|\\/\\-]*'
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g

export function normalizeModerationText(value, { compact = false } = {}) {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(ZERO_WIDTH, '')
    .toLowerCase()
    .replace(/[0123456789@$!+]/g, (character) => LEET[character] || character)
    .replace(/([a-z])\1+/g, '$1')
    .replace(/[^a-z0-9]+/g, compact ? '' : ' ')
    .trim()
  return normalized
}

function normalizeCharacters(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(ZERO_WIDTH, '')
    .toLowerCase()
    .replace(/[0123456789@$!+]/g, (character) => LEET[character] || character)
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function termPattern(term) {
  const words = normalizeModerationText(term).split(/\s+/)
  const wordPatterns = words.map((word) =>
    [...word].map((character) => `${escapeRegex(character)}+`).join(LETTER_SEPARATOR)
  )
  return new RegExp(`(?:^|[^a-z0-9])${wordPatterns.join('[^a-z0-9]+')}(?=$|[^a-z0-9])`, 'i')
}

const COMPILED_TERMS = BLOCKED_TERMS.map((term) => ({ term, pattern: termPattern(term) }))

export function findBlockedTerms(value, { context = 'text' } = {}) {
  const source = normalizeCharacters(value)
  if (!source.trim()) return []

  const matches = COMPILED_TERMS
    .filter(({ pattern }) => pattern.test(source))
    .map(({ term }) => term)

  if (context === 'identifier') {
    const compact = normalizeModerationText(value, { compact: true })
    const identifierToCheck = IDENTIFIER_FALSE_POSITIVE_ALLOWLIST.reduce(
      (candidate, allowedWord) => candidate.replaceAll(
        normalizeModerationText(allowedWord, { compact: true }),
        ''
      ),
      compact
    )
    for (const term of EMBEDDED_IDENTIFIER_TERMS) {
      if (identifierToCheck.includes(normalizeModerationText(term, { compact: true }))) matches.push(term)
    }
  }

  return [...new Set(matches)]
}

export function moderateText(value, options = {}) {
  const blockedTerms = findBlockedTerms(value, options)
  return {
    allowed: blockedTerms.length === 0,
    blockedTerms,
    reason: blockedTerms.length ? 'Contains inappropriate language' : null,
  }
}

// Backwards-compatible name for existing call sites; all behavior is centralized above.
export const filterTextContent = moderateText
