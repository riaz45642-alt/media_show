import { pool } from '../config/db.js'

export async function adjustReputation(userId, delta, reason, contentType = null) {
  if (!userId || !Number.isInteger(delta) || delta === 0) return
  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    await client.query(
      `UPDATE user_profiles SET reputation_score = GREATEST(0, reputation_score + $2), updated_at = now()
       WHERE user_id = $1`, [userId, delta]
    )
    await client.query(
      `INSERT INTO reputation_events (user_id, delta, reason, content_type) VALUES ($1,$2,$3,$4)`,
      [userId, delta, reason, contentType]
    )
    await client.query('COMMIT')
  } catch (error) {
    await client?.query('ROLLBACK').catch(() => {})
    console.error('adjustReputation failed:', { userId, delta, reason, message: error.message, code: error.code })
  } finally {
    client?.release()
  }
}
