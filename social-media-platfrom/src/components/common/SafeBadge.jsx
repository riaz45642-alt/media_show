import { CheckCircle2, XCircle } from 'lucide-react'
import { computeContentHealth } from '../../utils/reputation'

// Single icon-only status indicator per post — green check when
// safe/verified, red check when unsafe. No text, no extra icons.
export default function SafeBadge({ post }) {
  const health = computeContentHealth(post)
  const isSafe = post?.safe !== false && health.status !== 'Under Review'

  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
        isSafe ? 'bg-secondary/10 text-secondary-dark dark:text-secondary' : 'bg-red-50 text-red-500 dark:bg-red-500/10'
      }`}
      title={isSafe ? 'Safe' : 'Unsafe'}
      aria-label={isSafe ? 'Safe' : 'Unsafe'}
    >
      {isSafe ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
    </span>
  )
}
