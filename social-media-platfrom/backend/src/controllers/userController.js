import { pool } from '../config/db.js'

export async function getMe(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, age, age_group, avatar_url, bio, safe_zone_score FROM users WHERE id = $1',
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
    const { rows } = await pool.query(
      `UPDATE users SET name = COALESCE($1,name), bio = COALESCE($2,bio), avatar_url = COALESCE($3,avatar_url)
       WHERE id = $4 RETURNING id, name, email, age, age_group, avatar_url, bio`,
      [name, bio, avatarUrl, req.user.id]
    )
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}
