import { useEffect } from 'react'
import { blockedTermAlertMessage, BLOCKED_USERNAME_MESSAGE } from '../../config/blockedTerms'
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
        const identifierField = /^(user(name)?|display_?name|name)$/i.test(field.name || field.id || '')
        const result = filterTextContent(field.value, { context: identifierField ? 'identifier' : 'text' })
        if (result.allowed) continue

        event.preventDefault()
        event.stopPropagation()
        field.setAttribute('aria-invalid', 'true')
        field.focus()

        const firstTerm = result.blockedTerms[0]
        const start = field.value.toLowerCase().indexOf(firstTerm.toLowerCase())
        if (start >= 0 && typeof field.setSelectionRange === 'function') {
          field.setSelectionRange(start, start + firstTerm.length)
        }
        window.alert(identifierField
          ? `${BLOCKED_USERNAME_MESSAGE}\n\nPlease change: ${result.blockedTerms.join(', ')}`
          : blockedTermAlertMessage(result.blockedTerms))
        return
      }
    }

    document.addEventListener('submit', guardSubmission, true)
    return () => document.removeEventListener('submit', guardSubmission, true)
  }, [])

  return null
}
