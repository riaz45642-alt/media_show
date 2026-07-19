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
    const { text, imageUrl, tag, imageBase64, imageMimeType } = req.body
    const image = imageBase64 ? { base64: imageBase64, mimeType: imageMimeType } : undefined

    const result = await moderate({ text, image, userId: req.user.id, contentType: 'post' })

    const { rows } = await pool.query(
      `INSERT INTO posts (user_id, text_content, image_url, tag, moderation_status, risk_score, moderation_reason, ai_response)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.user.id,
        text,
        imageUrl || null,
        tag || null,
        result.status,
        result.riskScore,
        result.reason,
        JSON.stringify(result.ai),
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
