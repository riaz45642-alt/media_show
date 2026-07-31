import { BLOCKED_TERMS } from '../config/blockedTerms'

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' }

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457@$]/g, (character) => LEET[character] || character)
    .replace(/(.)\1{2,}/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function findBlockedTerms(value) {
  const text = ` ${normalize(value)} `
  return [...new Set(BLOCKED_TERMS.filter((term) => text.includes(` ${normalize(term)} `)))]
}

export function filterTextContent(value) {
  const matches = findBlockedTerms(value)
  return { allowed: matches.length === 0, matches }
}
