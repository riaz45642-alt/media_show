import { moderate } from '../services/moderationService.js'

// POST /api/moderation/analyze
// Generic endpoint used by the frontend "check before you post" flow and by
// other controllers internally. Accepts optional auth (userId used only for
// spam/flood heuristics), so it also works for pre-signup username checks.
export async function analyze(req, res, next) {
  try {
    const { text, imageBase64, imageMimeType, contentType } = req.body
    const image = imageBase64 ? { base64: imageBase64, mimeType: imageMimeType } : undefined

    const result = await moderate({
      text,
      image,
      userId: req.user?.id,
      contentType: contentType || 'generic',
    })

    res.json(result)
  } catch (err) {
    next(err)
  }
}
