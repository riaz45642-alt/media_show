import { pool } from '../config/db.js'
import { moderate } from '../services/moderationService.js'

export async function listComments(req, res, next) {
  try {
    const { postId } = req.params
    const { rows } = await pool.query(
      `SELECT c.id, c.text_content, c.created_at, c.user_id, u.name AS author
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1 AND c.moderation_status = 'safe'
       ORDER BY c.created_at ASC LIMIT 200`,
      [postId]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function createComment(req, res, next) {
  try {
    const { postId } = req.params
    const { text } = req.body

    const result = await moderate({ text, userId: req.user.id, contentType: 'comment' })

    const { rows } = await pool.query(
      `INSERT INTO comments (post_id, user_id, text_content, moderation_status, risk_score, moderation_reason, ai_response)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, text_content, created_at, moderation_status`,
      [postId, req.user.id, text, result.status, result.riskScore, result.reason, JSON.stringify(result.ai)]
    )

    if (result.status === 'rejected') {
      return res.status(422).json({ message: 'Comment rejected by moderation', reason: result.reason })
    }

    res.status(201).json({ comment: rows[0], moderation: result })
  } catch (err) {
    next(err)
  }
}
