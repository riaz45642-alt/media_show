// Hybrid moderation pipeline: Rule-Based Filtering -> Gemini AI Analysis ->
// Risk Scoring -> Decision Engine -> Approved / Warning / Rejected / Human Review.
// This is the single entry point every content type (posts, comments,
// usernames, bios, images) should call before being persisted or shown.

import { runRuleBasedFilter, validateUpload } from './ruleBasedFilter.js'
import { analyzeTextWithGemini } from './geminiService.js'
import { computeDecision } from './riskEngine.js'
import { adjustReputation } from './reputationService.js'

export const PERSISTED_MODERATION_STATUSES = Object.freeze(['safe', 'flagged', 'rejected'])
const persistedStatuses = new Set(PERSISTED_MODERATION_STATUSES)

export function validateModerationDecision(decision) {
  if (!decision || !persistedStatuses.has(decision.status)) {
    const error = new Error(`Invalid moderation status: ${decision?.status ?? 'missing'}`)
    error.code = 'INVALID_MODERATION_STATUS'
    throw error
  }
  return decision
}

/**
 * @param {{ text?: string, imageUrl?: string, image?: {base64,mimeType}, userId?: string, contentType?: string }} input
 * @returns {Promise<{status:'safe'|'flagged'|'rejected', riskScore:number, reason:string|null, flags:string[], ai:{text:object,image:object}}>}
 */
export async function moderate({ text, imageUrl, image, userId, contentType = 'post' } = {}) {
  const finalize = async (decision) => {
    const validated = validateModerationDecision(decision)
    if (validated.status === 'rejected' && userId) await adjustReputation(userId, -10, 'moderation_rejection', contentType)
    return validated
  }
  const ruleResult = runRuleBasedFilter({ text, userId, contentType })

  // Hard block (SQLi/XSS) short-circuits before ever calling the AI model.
  if (ruleResult.blocked) {
    const decision = computeDecision({ ruleResult })
    return finalize({ ...decision, ai: { text: null, image: null } })
  }

  if (image) {
    const upload = validateUpload({ mimeType: image.mimeType, sizeBytes: image.sizeBytes, kind: 'image' })
    if (!upload.valid) {
      return finalize({
        status: 'rejected',
        riskScore: 100,
        reason: upload.reason,
        flags: [upload.reason],
        ai: { text: null, image: null },
      })
    }
  }

  // Text remains on the existing Gemini pipeline. Media is authoritatively
  // moderated from the uploaded file by Sightengine in mediaModerationService.
  const textAi = text ? await analyzeTextWithGemini(text) : null
  const imageAi = null

  const decision = computeDecision({ ruleResult, textAi, imageAi })
  return finalize({ ...decision, ai: { text: textAi, image: imageAi } })
}

// Backwards-compatible helpers (kept so any existing call sites don't break).
export async function analyzeText(text = '') {
  const result = await moderate({ text })
  return { safe: result.status === 'safe', flags: result.flags }
}

export async function analyzeImage(imageUrl) {
  if (!imageUrl) return { safe: true, flags: [] }
  return { safe: true, flags: [] } // imageUrl (remote) path unsupported without fetching bytes; use `image` {base64} instead.
}
