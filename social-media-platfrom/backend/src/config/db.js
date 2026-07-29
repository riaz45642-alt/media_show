import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

function databaseConfig() {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) throw new Error('DATABASE_URL is required')

  let url
  try {
    url = new URL(connectionString)
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL')
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use the postgres:// or postgresql:// protocol')
  }

  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID)
  const isSupabaseDirect = /^db\.[^.]+\.supabase\.co$/i.test(url.hostname)
  const isSupabasePooler = /\.pooler\.supabase\.com$/i.test(url.hostname)
  if (isRender && isSupabaseDirect) {
    throw new Error(
      'Render cannot reliably reach the IPv6-only Supabase direct database endpoint. ' +
      'Set DATABASE_URL to the Supabase Session pooler URI (aws-*.pooler.supabase.com:5432).'
    )
  }
  if (isSupabasePooler && !decodeURIComponent(url.username).includes('.')) {
    throw new Error(
      'The Supabase pooler DATABASE_URL has an invalid username. Copy the complete Session pooler URI ' +
      'from Supabase Connect; its username is normally postgres.<project-ref>, not postgres.'
    )
  }

  return {
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX || 10),
    min: Number(process.env.DB_POOL_MIN || 0),
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10_000),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30_000),
    maxLifetimeSeconds: Number(process.env.DB_MAX_LIFETIME_SECONDS || 1_800),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    allowExitOnIdle: false,
  }
}

export const pool = new pg.Pool({
  ...databaseConfig(),
})

pool.on('error', (error) => {
  console.error(JSON.stringify({
    level: 'error',
    event: 'postgres_idle_client_error',
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    },
  }))
})

export async function checkDatabase() {
  const startedAt = Date.now()
  const { rows } = await pool.query('SELECT current_database() AS database, now() AS checked_at')
  return { ...rows[0], latencyMs: Date.now() - startedAt }
}

export default pool
