import { pool } from '../config/db.js'
import { moderate } from '../services/moderationService.js'
import { validateDisplayName } from '../services/ruleBasedFilter.js'

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export async function searchUsers(req, res, next) {
  try {
    const search = String(req.query.search || '').trim()
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 20))
    const { rows } = await pool.query(
      `SELECT u.id, p.display_name AS name, p.username
       FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id <> $1 AND u.status = 'active' AND u.deleted_at IS NULL
         AND ($2 = '' OR p.display_name ILIKE '%' || $2 || '%' OR p.username ILIKE '%' || $2 || '%')
       ORDER BY CASE WHEN $2 <> '' AND p.display_name ILIKE $2 || '%' THEN 0 ELSE 1 END,
                p.display_name
       LIMIT $3`,
      [req.user.id, search, limit]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function getUserProfile(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, p.display_name AS name, p.username, p.bio, p.age_group,
              count(DISTINCT f1.follower_id)::int AS follower_count,
              count(DISTINCT f2.followed_id)::int AS following_count,
              count(DISTINCT po.id)::int AS post_count
       FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN follows f1 ON f1.followed_id = u.id
       LEFT JOIN follows f2 ON f2.follower_id = u.id
       LEFT JOIN posts po ON po.author_id = u.id AND po.deleted_at IS NULL AND po.moderation_status = 'safe'
       WHERE u.id = $1 AND u.status = 'active' AND u.deleted_at IS NULL
       GROUP BY u.id, p.display_name, p.username, p.bio, p.age_group`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'User not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

export async function getMe(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, p.display_name AS name, u.email, p.date_of_birth, p.age_group,
              p.username, p.bio, p.safe_zone_score, u.role, u.status
       FROM users u JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    )
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

export async function updateMe(req, res, next) {
  try {
    const { name, bio } = req.body

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
      `UPDATE user_profiles SET display_name = COALESCE($1, display_name),
         bio = COALESCE($2, bio), updated_at = now()
       WHERE user_id = $3
       RETURNING user_id AS id, display_name AS name, username, date_of_birth, age_group, bio`,
      [name, bio, req.user.id]
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
      `SELECT p.warnings_count, u.status,
              COALESCE((SELECT max(risk_score) FROM moderation_cases
                        WHERE target_type = 'user' AND target_id = u.id), 0) AS risk_score
       FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
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
         COALESCE(SUM(like_count), 0) AS total_likes
       FROM posts WHERE author_id = $1`,
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
      `SELECT p.id, 'post' AS content_type, p.body AS preview, p.moderation_status, p.risk_score,
              p.moderation_reason, p.created_at, mc.reviewed_at
       FROM posts p LEFT JOIN moderation_cases mc ON mc.target_type = 'post' AND mc.target_id = p.id
       WHERE p.author_id = $1 ORDER BY p.created_at DESC LIMIT 100`,
      [req.user.id]
    )
    const { rows: comments } = await pool.query(
      `SELECT c.id, 'comment' AS content_type, c.body AS preview, c.moderation_status, c.risk_score,
              c.moderation_reason, c.created_at, mc.reviewed_at
       FROM comments c LEFT JOIN moderation_cases mc ON mc.target_type = 'comment' AND mc.target_id = c.id
       WHERE c.author_id = $1 ORDER BY c.created_at DESC LIMIT 100`,
      [req.user.id]
    )
    const { rows: appeals } = await pool.query(
      `SELECT id, content_type, content_id, status, created_at, reviewed_at FROM appeals
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    )
    const { rows: userRows } = await pool.query(`SELECT warnings_count FROM user_profiles WHERE user_id = $1`, [req.user.id])

    const items = [...posts, ...comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    res.json({ items, appeals, warningsCount: userRows[0]?.warnings_count || 0 })
  } catch (err) {
    next(err)
  }
}
