// Hybrid moderation pipeline: Rule-Based Filtering -> Gemini AI Analysis ->
// Risk Scoring -> Decision Engine -> Approved / Warning / Rejected / Human Review.
// This is the single entry point every content type (posts, comments,
// usernames, bios, images) should call before being persisted or shown.

import { runRuleBasedFilter, validateUpload } from './ruleBasedFilter.js'
import { analyzeTextWithGemini, analyzeImageWithGemini } from './geminiService.js'
import { computeDecision } from './riskEngine.js'

/**
 * @param {{ text?: string, imageUrl?: string, image?: {base64,mimeType}, userId?: string, contentType?: string }} input
 * @returns {Promise<{status:'safe'|'flagged'|'rejected', riskScore:number, reason:string|null, flags:string[], ai:{text:object,image:object}}>}
 */
export async function moderate({ text, imageUrl, image, userId, contentType = 'post' } = {}) {
  const ruleResult = runRuleBasedFilter({ text, userId, contentType })

  // Hard block (SQLi/XSS) short-circuits before ever calling the AI model.
  if (ruleResult.blocked) {
    const decision = computeDecision({ ruleResult })
    return { ...decision, ai: { text: null, image: null } }
  }

  if (image) {
    const upload = validateUpload({ mimeType: image.mimeType, sizeBytes: image.sizeBytes, kind: 'image' })
    if (!upload.valid) {
      return {
        status: 'rejected',
        riskScore: 100,
        reason: upload.reason,
        flags: [upload.reason],
        ai: { text: null, image: null },
      }
    }
  }

  const [textAi, imageAi] = await Promise.all([
    text ? analyzeTextWithGemini(text) : Promise.resolve(null),
    image ? analyzeImageWithGemini(image) : Promise.resolve(null),
  ])

  const decision = computeDecision({ ruleResult, textAi, imageAi })
  return { ...decision, ai: { text: textAi, image: imageAi } }
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
