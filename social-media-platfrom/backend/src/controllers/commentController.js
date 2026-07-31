import { pool } from '../config/db.js'
import { moderate } from '../services/moderationService.js'

export async function listComments(req, res, next) {
  try {
    const { postId } = req.params
    const { rows } = await pool.query(
      `SELECT c.id, c.body AS text_content, c.created_at, c.author_id AS user_id, u.display_name AS author
       FROM comments c JOIN user_profiles u ON u.user_id = c.author_id
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
      `INSERT INTO comments (post_id, author_id, body, moderation_status, risk_score, moderation_reason)
       VALUES ($1,$2,$3,$4::moderation_state,$5,$6)
       RETURNING id, body AS text_content, created_at, moderation_status, author_id AS user_id`,
      [postId, req.user.id, text, result.status, result.riskScore, result.reason]
    )

    if (result.status === 'rejected') {
      return res.status(422).json({ message: 'Comment rejected by moderation', reason: result.reason })
    }
    const countResult = await pool.query(
      `UPDATE posts SET comment_count = (
         SELECT count(*) FROM comments WHERE post_id = $1 AND deleted_at IS NULL AND moderation_status = 'safe'
       ) WHERE id = $1 RETURNING comment_count`,
      [postId]
    )

    res.status(201).json({
      comment: { ...rows[0], author: req.user.name || 'Member' },
      commentCount: Number(countResult.rows[0]?.comment_count || 0),
      moderation: result,
    })
  } catch (err) {
    next(err)
  }
}
