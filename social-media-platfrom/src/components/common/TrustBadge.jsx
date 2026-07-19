import { ShieldCheck, Gauge } from 'lucide-react'
import { computeReputation } from '../../utils/reputation'

// Compact trust/reputation badge for profiles & cards.
// `signals` optionally overrides the mock model inputs; otherwise defaults are used.
export default function TrustBadge({ signals, showScore = true, size = 'md' }) {
  const { trustScore, tier } = computeReputation(signals)
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${tier.color} ${pad}`}
      title={`Trust Score: ${trustScore}/100`}
    >
      <ShieldCheck size={size === 'sm' ? 11 : 13} />
      {tier.label}
      {showScore && (
        <span className="opacity-70 flex items-center gap-0.5">
          <Gauge size={size === 'sm' ? 10 : 12} />
          {trustScore}
        </span>
      )}
    </span>
  )
}
