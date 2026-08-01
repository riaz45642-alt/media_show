import { BLOCKED_TERMS } from '../config/blockedTerms.js'

const LEET = Object.freeze({
  '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g',
  '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i', '+': 't',
})
const LETTER_SEPARATOR = '[\\s._*~|\\/\\-]*'

function normalizeCharacters(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[0123456789@$!+]/g, (character) => LEET[character] || character)
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function termPattern(term) {
  const words = normalizeCharacters(term).trim().split(/\s+/)
  const wordPatterns = words.map((word) =>
    [...word].map((character) => `${escapeRegex(character)}+`).join(LETTER_SEPARATOR)
  )
  // Non-alphanumeric boundaries prevent substring false positives (for example,
  // a blocked short word cannot match inside an ordinary longer word).
  return new RegExp(`(?:^|[^a-z0-9])${wordPatterns.join('[^a-z0-9]+')}(?=$|[^a-z0-9])`, 'i')
}

const COMPILED_TERMS = BLOCKED_TERMS.map((term) => ({ term, pattern: termPattern(term) }))

export function findBlockedTerms(value) {
  const text = normalizeCharacters(value)
  if (!text.trim()) return []
  return COMPILED_TERMS.filter(({ pattern }) => pattern.test(text)).map(({ term }) => term)
}

export function filterTextContent(value) {
  const matches = findBlockedTerms(value)
  return { allowed: matches.length === 0, matches }
}
