// Lightweight, client-side Trust & Reputation scoring model.
// Combines several weighted signals (0-100 each) into a single trust score
// plus a badge tier. Swap the raw-signal inputs for real backend metrics
// (reports, violations, moderation history, helpful actions) when wired up.

export const TIERS = [
  { min: 90, key: 'trusted', label: 'Trusted User', color: 'text-secondary-dark bg-secondary/10' },
  { min: 75, key: 'helper', label: 'Community Helper', color: 'text-primary bg-primary/10' },
  { min: 50, key: 'member', label: 'Member', color: 'text-gray-500 bg-gray-100 dark:bg-white/10' },
  { min: 0, key: 'new', label: 'New Member', color: 'text-accent-dark bg-accent/15' },
]

const WEIGHTS = {
  safety: 0.35, // inverse of reports/violations
  community: 0.25, // positive engagement, helpful contributions
  moderation: 0.25, // clean moderation history
  activity: 0.15, // consistent, healthy participation
}

export function computeReputation(signals = {}) {
  const safety = clamp(signals.safety ?? 85)
  const community = clamp(signals.community ?? 70)
  const moderation = clamp(signals.moderation ?? 90)
  const activity = clamp(signals.activity ?? 60)

  const trustScore = Math.round(
    safety * WEIGHTS.safety +
      community * WEIGHTS.community +
      moderation * WEIGHTS.moderation +
      activity * WEIGHTS.activity
  )

  const tier = TIERS.find((t) => trustScore >= t.min) || TIERS[TIERS.length - 1]

  return {
    trustScore,
    safetyScore: safety,
    reputationScore: community,
    communityScore: Math.round((community + moderation) / 2),
    tier,
    breakdown: { safety, community, moderation, activity },
  }
}

// Content Health Score: per-post safety/quality signal shown to authors & mods.
export function computeContentHealth(post = {}) {
  const aiConfidence = post.aiConfidence ?? (post.safe ? 96 : 62)
  const safetyRating = post.flagged ? 55 : post.safe ? 97 : 80
  const qualityRating = post.qualityRating ?? 84
  const communityRating = post.communityRating ?? (post.likes > 20 ? 90 : 72)

  const overall = Math.round(
    safetyRating * 0.4 + qualityRating * 0.25 + communityRating * 0.2 + aiConfidence * 0.15
  )

  let status = 'Community Safe'
  if (post.flagged) status = 'Under Review'
  else if (overall < 70) status = 'Limited Visibility'

  return { overall, safetyRating, qualityRating, communityRating, aiConfidence, status }
}

function clamp(n) {
  return Math.max(0, Math.min(100, n))
}
