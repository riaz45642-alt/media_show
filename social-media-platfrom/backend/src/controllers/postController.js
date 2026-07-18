import { pool } from '../config/db.js'
import { moderate } from '../services/moderationService.js'

export async function listPosts(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM posts WHERE moderation_status = 'safe' ORDER BY created_at DESC LIMIT 50`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function createPost(req, res, next) {
  try {
    const { text, imageUrl, tag } = req.body
    const result = await moderate({ text, imageUrl })

    const { rows } = await pool.query(
      `INSERT INTO posts (user_id, text_content, image_url, tag, moderation_status)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, text, imageUrl || null, tag || null, result.status]
    )
    res.status(201).json({ post: rows[0], moderation: result })
  } catch (err) {
    next(err)
  }
}
