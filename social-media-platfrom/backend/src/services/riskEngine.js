// Combines rule-based risk points with Gemini's overall_score into a single
// 0-100 risk score, then maps it to a moderation decision.
//
//   0-30   -> safe            (auto-approved)
//   31-70  -> flagged         (warning / sent to human review queue)
//   71-100 -> rejected        (auto-rejected, never goes live)
//
// Either signal alone can force escalation: a hard rule-based block always
// rejects; a very high single Gemini category (e.g. self-harm) escalates
// even if the blended average would look moderate.

const HIGH_SEVERITY_CATEGORIES = ['self_harm', 'extremism', 'threats', 'violence']

export function computeDecision({ ruleResult, textAi, imageAi }) {
  if (ruleResult?.blocked) {
    return {
      status: 'rejected',
      riskScore: 100,
      reason: ruleResult.blockReason,
      flags: ruleResult.flags,
    }
  }

  const ruleScore = ruleResult?.riskPoints || 0
  const aiScores = [textAi, imageAi].filter((r) => r?.available).map((r) => r.overall_score)
  const aiScore = aiScores.length ? Math.max(...aiScores) : 0

  // Blend: AI signal weighted higher when available, rules otherwise dominate.
  const blended = aiScores.length
    ? Math.round(ruleScore * 0.4 + aiScore * 0.6)
    : ruleScore

  const criticalHit = [textAi, imageAi].some(
    (r) => r?.available && HIGH_SEVERITY_CATEGORIES.some((cat) => (r.categories?.[cat] || 0) >= 75)
  )

  let riskScore = Math.min(blended, 100)
  if (criticalHit) riskScore = Math.max(riskScore, 85)

  let status
  if (riskScore <= 30) status = 'safe'
  else if (riskScore <= 70) status = 'flagged'
  else status = 'rejected'

  const reasonParts = []
  if (ruleResult?.flags?.length) reasonParts.push(...ruleResult.flags)
  if (textAi?.available && textAi.primary_concern) reasonParts.push(`text:${textAi.primary_concern}`)
  if (imageAi?.available && imageAi.primary_concern) reasonParts.push(`image:${imageAi.primary_concern}`)

  return {
    status,
    riskScore,
    reason: reasonParts.join(', ') || null,
    flags: ruleResult?.flags || [],
  }
}
