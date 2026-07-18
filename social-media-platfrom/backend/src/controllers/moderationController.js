import { moderate } from '../services/moderationService.js'

export async function analyze(req, res, next) {
  try {
    const { text, imageUrl } = req.body
    const result = await moderate({ text, imageUrl })
    res.json(result)
  } catch (err) {
    next(err)
  }
}
