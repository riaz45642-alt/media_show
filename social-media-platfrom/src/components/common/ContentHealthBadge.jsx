import { Sparkles, AlertTriangle, Eye } from 'lucide-react'
import { computeContentHealth } from '../../utils/reputation'

// Per-post Community status. Kept minimal — a single labeled pill with a
// hover tooltip for the score, instead of a clickable breakdown panel.
export default function ContentHealthBadge({ post }) {
  const health = computeContentHealth(post)

  const isReview = health.status === 'Under Review'
  const isGood = health.status === 'Community Safe'
  const label = isReview ? 'Under Review' : 'Community'
  const Icon = isReview ? AlertTriangle : isGood ? Sparkles : Eye
  const color = isReview
    ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
    : isGood
    ? 'text-secondary-dark bg-secondary/10'
    : 'text-amber-600 bg-amber-50 dark:bg-amber-500/10'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${color}`}
      title={`Content Health Score: ${health.overall}/100`}
    >
      <Icon size={12} />
      {label}
    </span>
  )
}
