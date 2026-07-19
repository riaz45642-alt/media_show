import { pool } from '../config/db.js'
import { moderate } from '../services/moderationService.js'
import { validateDisplayName } from '../services/ruleBasedFilter.js'

export async function getMe(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, age, age_group, avatar_url, bio, safe_zone_score, role, status FROM users WHERE id = $1',
      [req.user.id]
    )
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

export async function updateMe(req, res, next) {
  try {
    const { name, bio, avatarUrl } = req.body

    if (name) {
      const check = validateDisplayName(name)
      if (!check.valid) {
        return res.status(422).json({ message: 'Display name not allowed', flags: check.flags, suggestions: check.suggestions })
      }
    }

    let moderation = null
    if (bio) {
      moderation = await moderate({ text: bio, userId: req.user.id, contentType: 'bio' })
      if (moderation.status === 'rejected') {
        return res.status(422).json({ message: 'Bio rejected by moderation', reason: moderation.reason })
      }
    }

    const { rows } = await pool.query(
      `UPDATE users SET
         name = COALESCE($1,name),
         bio = COALESCE($2,bio),
         avatar_url = COALESCE($3,avatar_url),
         moderation_status = COALESCE($4, moderation_status),
         risk_score = COALESCE($5, risk_score),
         moderation_reason = COALESCE($6, moderation_reason),
         updated_at = now()
       WHERE id = $7
       RETURNING id, name, email, age, age_group, avatar_url, bio, moderation_status`,
      [
        name,
        bio,
        avatarUrl,
        moderation?.status || null,
        moderation?.riskScore ?? null,
        moderation?.reason || null,
        req.user.id,
      ]
    )
    res.json({ user: rows[0], moderation })
  } catch (err) {
    next(err)
  }
}
