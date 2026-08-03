import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'

let schemaPromise

export async function ensureParentControlSchema() {
  if (!schemaPromise) {
    schemaPromise = pool.query(`
      ALTER TABLE user_settings
        ADD COLUMN IF NOT EXISTS messaging_enabled boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS parent_password_hash text,
        ADD COLUMN IF NOT EXISTS daily_screen_time_minutes integer;

      CREATE TABLE IF NOT EXISTS user_daily_usage (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        usage_date date NOT NULL,
        active_seconds integer NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, usage_date)
      );

      CREATE TABLE IF NOT EXISTS screen_time_sessions (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id uuid NOT NULL,
        usage_date date NOT NULL,
        last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, session_id, usage_date)
      );

      CREATE INDEX IF NOT EXISTS screen_time_sessions_date_idx ON screen_time_sessions (usage_date);
    `).catch((error) => {
      schemaPromise = null
      throw error
    })
  }
  await schemaPromise
}

export const validParentPassword = (password) => typeof password === 'string' && password.length >= 8 && password.length <= 128
export const validParentHash = (hash) => typeof hash === 'string' && /^\$2[aby]\$\d{2}\$/.test(hash)

export async function verifyParentPassword(password, hash) {
  if (!validParentHash(hash)) return false
  try { return await bcrypt.compare(String(password || ''), hash) }
  catch { return false }
}

export function screenTimeLimitReached(minutes, activeSeconds) {
  return minutes !== null && minutes !== undefined && Number(activeSeconds) >= Number(minutes) * 60
}
