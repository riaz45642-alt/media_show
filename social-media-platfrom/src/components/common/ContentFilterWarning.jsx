import { ShieldAlert } from 'lucide-react'
import { BLOCKED_TERM_MESSAGE } from '../../config/blockedTerms'

export default function ContentFilterWarning({ matches = [] }) {
  if (!matches.length) return null
  return (
    <div role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
      <p className="flex items-start gap-2"><ShieldAlert size={16} className="mt-0.5 shrink-0" />{BLOCKED_TERM_MESSAGE}</p>
      <p className="mt-2 text-xs font-semibold">
        Change: {matches.map((word) => <mark key={word} className="mx-0.5 rounded bg-red-200 px-1 text-red-900">{word}</mark>)}
      </p>
    </div>
  )
}
