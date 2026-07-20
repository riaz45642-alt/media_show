import { Sparkles, CheckCircle2, XCircle } from 'lucide-react'
import { computeContentHealth } from '../../utils/reputation'

// Icon-only Community + Safety indicators — no text labels, tooltips carry
// the meaning so the post header stays clean and uncluttered.
export default function ContentHealthBadge({ post }) {
  const health = computeContentHealth(post)
  const isSafe = health.status !== 'Under Review'

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"
        title="Community"
        aria-label="Community"
      >
        <Sparkles size={14} />
      </span>
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
          isSafe ? 'bg-secondary/10 text-secondary-dark' : 'bg-red-50 text-red-500 dark:bg-red-500/10'
        }`}
        title={isSafe ? 'Safe' : 'Unsafe'}
        aria-label={isSafe ? 'Safe' : 'Unsafe'}
      >
        {isSafe ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      </span>
    </span>
  )
}
