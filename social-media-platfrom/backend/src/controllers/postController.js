import { pool } from '../config/db.js'
import { moderate } from '../services/moderationService.js'

export async function listPosts(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, p.author_id AS user_id, p.body AS text_content,
              p.like_count AS likes_count, up.display_name AS author
       FROM posts p JOIN user_profiles up ON up.user_id = p.author_id
       WHERE p.moderation_status = 'safe' AND p.deleted_at IS NULL
       ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC LIMIT 50`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function createPost(req, res, next) {
  try {
    const { text, imageBase64, imageMimeType } = req.body
    const image = imageBase64 ? { base64: imageBase64, mimeType: imageMimeType } : undefined

    const result = await moderate({ text, image, userId: req.user.id, contentType: 'post' })

    const { rows } = await pool.query(
      `INSERT INTO posts (author_id, body, moderation_status, risk_score, moderation_reason, published_at)
       VALUES ($1,$2,$3,$4,$5,CASE WHEN $3 = 'safe' THEN now() ELSE NULL END)
       RETURNING *, author_id AS user_id, body AS text_content, like_count AS likes_count`,
      [
        req.user.id,
        text || '',
        result.status,
        result.riskScore,
        result.reason,
      ]
    )

    if (result.status === 'rejected') {
      return res.status(422).json({ message: 'Post rejected by moderation', reason: result.reason, post: rows[0] })
    }

    res.status(201).json({ post: rows[0], moderation: result })
  } catch (err) {
    next(err)
  }
}
