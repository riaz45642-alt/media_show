import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pool } from './config/db.js'

const migrationsDir = fileURLToPath(new URL('../migrations', import.meta.url))

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

async function run() {
  const client = await pool.connect()
  try {
    await ensureMigrationTable(client)
    const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort()

    for (const filename of files) {
      const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename])
      if (rowCount) {
        console.log(`Skipping ${filename} (already applied)`)
        continue
      }

      console.log(`Applying ${filename}`)
      const sql = await readFile(path.join(migrationsDir, filename), 'utf8')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename])
    }
    console.log('Migrations complete.')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((error) => {
  console.error('Migration failed:', error)
  process.exitCode = 1
})
