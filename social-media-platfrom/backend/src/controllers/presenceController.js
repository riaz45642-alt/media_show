import { getPresence } from '../services/presenceService.js'

export async function bulkPresence(req, res, next) {
  try {
    const ids = String(req.query.userIds || '').split(',').filter(Boolean)
    const rows = await getPresence(ids)
    res.json(rows)
  } catch (err) {
    next(err)
  }
}
