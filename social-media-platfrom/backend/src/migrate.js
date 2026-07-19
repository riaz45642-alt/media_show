// Minimal migration runner: executes each model's table SQL (CREATE TABLE IF
// NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS) in dependency order.
// Run with: npm run migrate
import { pool } from './config/db.js'
import { USER_TABLE_SQL } from './models/User.js'
import { POST_TABLE_SQL } from './models/Post.js'
import { COMMENT_TABLE_SQL } from './models/Comment.js'
import { REPORT_TABLE_SQL } from './models/Report.js'
import { APPEAL_TABLE_SQL } from './models/Appeal.js'
import { NOTIFICATION_TABLE_SQL } from './models/Notification.js'

const statements = [
  ['users', USER_TABLE_SQL],
  ['posts', POST_TABLE_SQL],
  ['comments', COMMENT_TABLE_SQL],
  ['reports', REPORT_TABLE_SQL],
  ['appeals', APPEAL_TABLE_SQL],
  ['notifications', NOTIFICATION_TABLE_SQL],
]

async function run() {
  for (const [name, sql] of statements) {
    console.log(`Migrating: ${name}`)
    await pool.query(sql)
  }
  console.log('Migrations complete.')
  await pool.end()
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
