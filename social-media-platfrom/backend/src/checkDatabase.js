import { pool } from './config/db.js'

const requiredColumns = {
  users: ['id', 'email', 'role', 'status', 'email_verified_at', 'last_login_at', 'deleted_at'],
  auth_identities: ['user_id', 'provider', 'provider_subject', 'provider_email', 'metadata', 'last_used_at'],
  user_profiles: ['user_id', 'username', 'display_name', 'age_group'],
  user_settings: ['user_id'],
  user_verification_status: ['user_id', 'status'],
  conversations: ['id', 'kind', 'created_by'],
  conversation_members: ['conversation_id', 'user_id', 'role'],
  groups: ['id', 'conversation_id', 'owner_id', 'name', 'category', 'privacy', 'member_count'],
  group_members: ['group_id', 'user_id', 'role'],
}

async function run() {
  const tables = Object.keys(requiredColumns)
  const { rows } = await pool.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [tables]
  )
  const found = new Map(tables.map((table) => [table, new Set()]))
  for (const row of rows) found.get(row.table_name)?.add(row.column_name)

  const missing = []
  for (const [table, columns] of Object.entries(requiredColumns)) {
    for (const column of columns) {
      if (!found.get(table).has(column)) missing.push(`${table}.${column}`)
    }
  }
  if (missing.length) throw new Error(`Database schema is missing: ${missing.join(', ')}`)
  console.log(`Database connection and required schema OK (${tables.length} tables checked).`)
}

run()
  .catch((error) => {
    console.error('Database check failed:', error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
