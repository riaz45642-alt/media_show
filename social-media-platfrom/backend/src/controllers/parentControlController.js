import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { ensureParentControlSchema, screenTimeLimitReached, validParentHash, validParentPassword, verifyParentPassword } from '../services/parentControlService.js'

export async function getParentControls(req, res, next) {
  try {
    await ensureParentControlSchema()
    const { rows } = await pool.query(
      `SELECT messaging_enabled, daily_screen_time_minutes, parent_password_hash
       FROM user_settings WHERE user_id = $1`, [req.user.id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'Parent settings were not found.' })
    const { parent_password_hash: hash, ...settings } = rows[0]
    res.json({ ...settings, parent_password_set: validParentHash(hash) })
  } catch (error) { next(error) }
}

export async function updateDailyLimit(req, res, next) {
  try {
    await ensureParentControlSchema()
    const minutes = req.body.minutes === null ? null : Number(req.body.minutes)
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 15 || minutes > 1440)) {
      return res.status(400).json({ message: 'Daily limit must be between 15 and 1440 minutes.' })
    }
    const { rows } = await pool.query(`SELECT parent_password_hash FROM user_settings WHERE user_id = $1`, [req.user.id])
    if (!validParentHash(rows[0]?.parent_password_hash)) return res.status(409).json({ message: 'Create a parent password first.', code: 'PARENT_PASSWORD_REQUIRED' })
    if (!await verifyParentPassword(req.body.password, rows[0].parent_password_hash)) {
      return res.status(403).json({ message: 'Incorrect parent password', code: 'INCORRECT_PARENT_PASSWORD' })
    }
    const updated = await pool.query(
      `UPDATE user_settings SET daily_screen_time_minutes = $1, updated_at = now()
       WHERE user_id = $2 RETURNING daily_screen_time_minutes`, [minutes, req.user.id]
    )
    if (!updated.rows[0]) return res.status(404).json({ message: 'Parent settings were not found.' })
    res.json({ daily_screen_time_minutes: updated.rows[0].daily_screen_time_minutes })
  } catch (error) { next(error) }
}

export async function getUsageStatus(req, res, next) {
  try {
    await ensureParentControlSchema()
    const { rows } = await pool.query(
      `SELECT s.daily_screen_time_minutes, COALESCE(u.active_seconds, 0)::int AS active_seconds
       FROM user_settings s
       LEFT JOIN user_daily_usage u ON u.user_id = s.user_id AND u.usage_date = (now() AT TIME ZONE 'UTC')::date
       WHERE s.user_id = $1`, [req.user.id]
    )
    const status = rows[0] || { daily_screen_time_minutes: null, active_seconds: 0 }
    res.json({ ...status, limit_reached: screenTimeLimitReached(status.daily_screen_time_minutes, status.active_seconds) })
  } catch (error) { next(error) }
}

export async function recordUsageHeartbeat(req, res, next) {
  const sessionId = String(req.body.sessionId || '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return res.status(400).json({ message: 'Invalid usage session.' })
  }
  try { await ensureParentControlSchema() } catch (error) { return next(error) }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const previous = await client.query(
      `SELECT last_heartbeat_at FROM screen_time_sessions
       WHERE user_id = $1 AND session_id = $2::uuid AND usage_date = (now() AT TIME ZONE 'UTC')::date
       FOR UPDATE`, [req.user.id, sessionId]
    )
    const elapsed = previous.rows[0]
      ? Math.max(0, Math.min(60, Math.floor((Date.now() - new Date(previous.rows[0].last_heartbeat_at).getTime()) / 1000)))
      : 0
    await client.query(
      `INSERT INTO screen_time_sessions (user_id, session_id, usage_date, last_heartbeat_at)
       VALUES ($1,$2::uuid,(now() AT TIME ZONE 'UTC')::date,now())
       ON CONFLICT (user_id, session_id, usage_date) DO UPDATE SET last_heartbeat_at = now()`,
      [req.user.id, sessionId]
    )
    const usage = await client.query(
      `INSERT INTO user_daily_usage (user_id, usage_date, active_seconds)
       VALUES ($1,(now() AT TIME ZONE 'UTC')::date,$2)
       ON CONFLICT (user_id, usage_date) DO UPDATE
       SET active_seconds = user_daily_usage.active_seconds + EXCLUDED.active_seconds, updated_at = now()
       RETURNING active_seconds`, [req.user.id, elapsed]
    )
    const settings = await client.query(`SELECT daily_screen_time_minutes FROM user_settings WHERE user_id = $1`, [req.user.id])
    await client.query('COMMIT')
    const minutes = settings.rows[0]?.daily_screen_time_minutes ?? null
    const activeSeconds = Number(usage.rows[0]?.active_seconds || 0)
    res.json({ daily_screen_time_minutes: minutes, active_seconds: activeSeconds, limit_reached: screenTimeLimitReached(minutes, activeSeconds) })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    next(error)
  } finally { client.release() }
}

export async function setParentPassword(req, res, next) {
  try {
    await ensureParentControlSchema()
    const password = String(req.body.password || '')
    if (!validParentPassword(password)) return res.status(400).json({ message: 'Parent password must be 8–128 characters.' })
    const existing = await pool.query(`SELECT parent_password_hash FROM user_settings WHERE user_id = $1`, [req.user.id])
    if (!existing.rows[0]) return res.status(404).json({ message: 'Parent settings were not found.' })
    if (validParentHash(existing.rows[0].parent_password_hash)) {
      return res.status(409).json({ message: 'Parent password is already configured.', code: 'PARENT_PASSWORD_ALREADY_SET', parent_password_set: true })
    }
    const hash = await bcrypt.hash(password, 12)
    const updated = await pool.query(
      `UPDATE user_settings SET parent_password_hash = $1, updated_at = now()
       WHERE user_id = $2 AND parent_password_hash IS NOT DISTINCT FROM $3
       RETURNING user_id`, [hash, req.user.id, existing.rows[0].parent_password_hash]
    )
    if (!updated.rows[0]) {
      return res.status(409).json({ message: 'Parent password is already configured.', code: 'PARENT_PASSWORD_ALREADY_SET', parent_password_set: true })
    }
    res.status(201).json({ parent_password_set: true })
  } catch (error) { next(error) }
}

export async function changeParentPassword(req, res, next) {
  try {
    await ensureParentControlSchema()
    const currentPassword = String(req.body.currentPassword || '')
    const newPassword = String(req.body.newPassword || '')
    if (!validParentPassword(newPassword)) return res.status(400).json({ message: 'New parent password must be 8–128 characters.' })
    const { rows } = await pool.query(`SELECT parent_password_hash FROM user_settings WHERE user_id = $1`, [req.user.id])
    if (!validParentHash(rows[0]?.parent_password_hash)) return res.status(409).json({ message: 'Create a parent password first.', code: 'PARENT_PASSWORD_REQUIRED' })
    if (!await verifyParentPassword(currentPassword, rows[0].parent_password_hash)) {
      return res.status(403).json({ message: 'Incorrect parent password', code: 'INCORRECT_PARENT_PASSWORD' })
    }
    const hash = await bcrypt.hash(newPassword, 12)
    await pool.query(`UPDATE user_settings SET parent_password_hash = $1, updated_at = now() WHERE user_id = $2`, [hash, req.user.id])
    res.json({ parent_password_set: true })
  } catch (error) { next(error) }
}

export async function updateMessagingPermission(req, res, next) {
  try {
    await ensureParentControlSchema()
    if (typeof req.body.enabled !== 'boolean') return res.status(400).json({ message: 'enabled must be a boolean.' })
    const password = String(req.body.password || '')
    const { rows } = await pool.query(`SELECT parent_password_hash FROM user_settings WHERE user_id = $1`, [req.user.id])
    if (!validParentHash(rows[0]?.parent_password_hash)) return res.status(409).json({ message: 'Create a parent password first.', code: 'PARENT_PASSWORD_REQUIRED' })
    if (!await verifyParentPassword(password, rows[0].parent_password_hash)) {
      return res.status(403).json({ message: 'Incorrect parent password', code: 'INCORRECT_PARENT_PASSWORD' })
    }
    const updated = await pool.query(
      `UPDATE user_settings SET messaging_enabled = $1, updated_at = now()
       WHERE user_id = $2 RETURNING messaging_enabled`, [req.body.enabled, req.user.id]
    )
    if (!updated.rows[0]) return res.status(404).json({ message: 'Parent settings were not found.' })
    res.json({ messaging_enabled: updated.rows[0].messaging_enabled })
  } catch (error) { next(error) }
}
