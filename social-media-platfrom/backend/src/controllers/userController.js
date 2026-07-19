import { pool } from '../config/db.js'
import { moderate } from '../services/moderationService.js'
import { validateDisplayName } from '../services/ruleBasedFilter.js'

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

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

// GET /api/users/:id/reputation  (or /api/users/me/reputation)
// Computes real Trust/Reputation/Safety/Community scores from DB signals,
// in the same shape utils/reputation.js's computeReputation() returns —
// so the frontend TrustBadge can render either the live or mock signals.
export async function getReputation(req, res, next) {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id

    const { rows: userRows } = await pool.query(
      `SELECT warnings_count, risk_score, status FROM users WHERE id = $1`,
      [userId]
    )
    if (!userRows[0]) return res.status(404).json({ message: 'User not found' })
    const user = userRows[0]

    const { rows: postStats } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE moderation_status = 'safe') AS approved,
         COUNT(*) FILTER (WHERE moderation_status = 'rejected') AS rejected,
         COUNT(*) FILTER (WHERE moderation_status = 'flagged') AS flagged,
         COUNT(*) AS total,
         COALESCE(SUM(likes_count), 0) AS total_likes
       FROM posts WHERE user_id = $1`,
      [userId]
    )
    const stats = postStats[0]
    const total = Number(stats.total) || 0
    const approved = Number(stats.approved) || 0
    const rejected = Number(stats.rejected) || 0

    const { rows: reportRows } = await pool.query(
      `SELECT COUNT(*) AS c FROM reports WHERE target_type = 'user' AND target_id = $1`,
      [userId]
    )
    const reportsAgainst = Number(reportRows[0].c) || 0

    const { rows: appealRows } = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'approved') AS won FROM appeals WHERE user_id = $1`,
      [userId]
    )
    const appealsWon = Number(appealRows[0].won) || 0

    const safety = clamp(100 - user.warnings_count * 8 - (user.risk_score || 0) * 0.5 - reportsAgainst * 5)
    const moderation = total > 0 ? clamp((approved / total) * 100) : 90
    const community = clamp(50 + Math.min(40, Number(stats.total_likes) * 0.5) + Math.min(10, appealsWon * 2))
    const activity = clamp(Math.min(100, total * 4))

    const trustScore = clamp(safety * 0.35 + community * 0.25 + moderation * 0.25 + activity * 0.15)

    const TIERS = [
      { min: 90, key: 'trusted', label: 'Trusted User' },
      { min: 75, key: 'helper', label: 'Community Helper' },
      { min: 50, key: 'member', label: 'Member' },
      { min: 0, key: 'new', label: 'New Member' },
    ]
    const tier = TIERS.find((t) => trustScore >= t.min) || TIERS[TIERS.length - 1]

    res.json({
      trustScore,
      safetyScore: safety,
      reputationScore: community,
      communityScore: Math.round((community + moderation) / 2),
      tier,
      breakdown: { safety, community, moderation, activity },
      stats: { totalPosts: total, approved, rejected, reportsAgainst, appealsWon },
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/users/me/moderation-history
// Combined feed of the current user's posts + comments with moderation
// status, plus warnings and linked appeals — for the Moderation History page.
export async function getModerationHistory(req, res, next) {
  try {
    const { rows: posts } = await pool.query(
      `SELECT id, 'post' AS content_type, text_content AS preview, moderation_status, risk_score,
              moderation_reason, created_at, reviewed_at
       FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    )
    const { rows: comments } = await pool.query(
      `SELECT id, 'comment' AS content_type, text_content AS preview, moderation_status, risk_score,
              moderation_reason, created_at, reviewed_at
       FROM comments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    )
    const { rows: appeals } = await pool.query(
      `SELECT id, content_type, content_id, status, created_at, reviewed_at FROM appeals
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    )
    const { rows: userRows } = await pool.query(`SELECT warnings_count FROM users WHERE id = $1`, [req.user.id])

    const items = [...posts, ...comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    res.json({ items, appeals, warningsCount: userRows[0]?.warnings_count || 0 })
  } catch (err) {
    next(err)
  }
}
