import { pool } from '../config/db.js'
import { moderate } from '../services/moderationService.js'
import { createNotification } from '../services/notificationService.js'
import { adjustReputation } from '../services/reputationService.js'

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
    const { text, parentCommentId = null } = req.body

    const result = await moderate({ text, userId: req.user.id, contentType: 'comment' })

    const { rows } = await pool.query(
      `INSERT INTO comments (post_id, author_id, body, moderation_status, risk_score, moderation_reason, parent_comment_id)
       VALUES ($1,$2,$3,$4::moderation_state,$5,$6,$7)
       RETURNING id, body AS text_content, created_at, moderation_status, author_id AS user_id`,
      [postId, req.user.id, text, result.status, result.riskScore, result.reason, parentCommentId]
    )

    if (result.status === 'rejected') {
      return res.status(422).json({ message: 'Comment rejected by moderation', reason: result.reason })
    }
    await adjustReputation(req.user.id, 1, 'approved_comment', 'comment')
    const countResult = await pool.query(
      `UPDATE posts SET comment_count = (
         SELECT count(*) FROM comments WHERE post_id = $1 AND deleted_at IS NULL AND moderation_status = 'safe'
       ) WHERE id = $1 RETURNING comment_count`,
      [postId]
    )
    const recipient = parentCommentId
      ? await pool.query(`SELECT author_id FROM comments WHERE id = $1`, [parentCommentId])
      : await pool.query(`SELECT author_id FROM posts WHERE id = $1`, [postId])
    if (recipient.rows[0] && recipient.rows[0].author_id !== req.user.id) await createNotification({
      userId: recipient.rows[0].author_id, actorId: req.user.id, category: 'comments', type: 'comment',
      text: parentCommentId ? 'Someone replied to your comment' : 'Someone commented on your post', link: `/post/${postId}`,
      entityType: parentCommentId ? 'comment' : 'post', entityId: parentCommentId || postId,
    })
    const mentions = [...new Set(String(text).match(/@([a-z0-9_]{3,30})/gi)?.map((match) => match.slice(1).toLowerCase()) || [])]
    if (mentions.length) {
      const mentioned = await pool.query(`SELECT user_id FROM user_profiles WHERE lower(username) = ANY($1::text[])`, [mentions])
      await Promise.all(mentioned.rows.filter(({ user_id }) => user_id !== req.user.id).map(({ user_id }) => createNotification({ userId: user_id, actorId: req.user.id, category: 'mentions', type: 'mention', text: 'Someone mentioned you in a comment', link: `/post/${postId}`, entityType: 'comment', entityId: rows[0].id })))
    }

    res.status(201).json({
      comment: { ...rows[0], author: req.user.name || 'Member' },
      commentCount: Number(countResult.rows[0]?.comment_count || 0),
      moderation: result,
    })
  } catch (err) {
    next(err)
  }
}
