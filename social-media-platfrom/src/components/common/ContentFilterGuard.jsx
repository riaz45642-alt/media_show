import { useEffect } from 'react'
import { BLOCKED_TERM_MESSAGE } from '../../config/blockedTerms'
import { filterTextContent } from '../../utils/contentFilter'

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel'])

export default function ContentFilterGuard() {
  useEffect(() => {
    const guardSubmission = (event) => {
      const fields = [...event.target.elements].filter((field) =>
        field instanceof HTMLTextAreaElement ||
        (field instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(field.type))
      )

      for (const field of fields) {
        const result = filterTextContent(field.value)
        if (result.allowed) continue

        event.preventDefault()
        event.stopPropagation()
        field.setAttribute('aria-invalid', 'true')
        field.focus()

        const firstTerm = result.matches[0]
        const start = field.value.toLowerCase().indexOf(firstTerm.toLowerCase())
        if (start >= 0 && typeof field.setSelectionRange === 'function') {
          field.setSelectionRange(start, start + firstTerm.length)
        }
        window.alert(`${BLOCKED_TERM_MESSAGE}\n\nPlease change: ${result.matches.join(', ')}`)
        return
      }
    }

    document.addEventListener('submit', guardSubmission, true)
    return () => document.removeEventListener('submit', guardSubmission, true)
  }, [])

  return null
}
