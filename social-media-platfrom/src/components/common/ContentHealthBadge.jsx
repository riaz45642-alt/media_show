import { useState } from 'react'
import { Sparkles, AlertTriangle, Eye } from 'lucide-react'
import { computeContentHealth } from '../../utils/reputation'

// Per-post Content Health Score. Click to expand the AI-transparency breakdown
// so users understand *why* a post was rated the way it was rated.
export default function ContentHealthBadge({ post }) {
  const [open, setOpen] = useState(false)
  const health = computeContentHealth(post)

  const isGood = health.status === 'Community Safe'
  const isReview = health.status === 'Under Review'
  const Icon = isReview ? AlertTriangle : isGood ? Sparkles : Eye
  const color = isReview
    ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
    : isGood
    ? 'text-secondary-dark bg-secondary/10'
    : 'text-amber-600 bg-amber-50 dark:bg-amber-500/10'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`tap-scale inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${color}`}
        title="Content Health Score"
      >
        <Icon size={12} />
        {health.status}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl bg-white dark:bg-gray-800 shadow-card p-3.5 text-xs animate-scaleIn">
          <p className="mb-2 font-semibold text-gray-700 dark:text-gray-100">
            AI Transparency · Score {health.overall}/100
          </p>
          <Row label="Safety Rating" value={health.safetyRating} />
          <Row label="Quality Rating" value={health.qualityRating} />
          <Row label="Community Rating" value={health.communityRating} />
          <Row label="AI Confidence" value={health.aiConfidence} />
          <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
            {isReview
              ? 'Flagged by our AI + community signals. A human moderator will review shortly.'
              : 'Verified by automated safety checks and community feedback.'}
          </p>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
        </div>
        <span className="w-6 text-right font-medium text-gray-600 dark:text-gray-300">{value}</span>
      </div>
    </div>
  )
}
