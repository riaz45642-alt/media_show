import test from 'node:test'
import assert from 'node:assert/strict'
import { pool } from '../src/config/db.js'
import { listPosts } from '../src/controllers/postController.js'
import { acceptFollowRequest, getUserProfile } from '../src/controllers/userController.js'
import { listNotifications } from '../src/controllers/notificationController.js'

async function captureFeedQuery(userId) {
  const originalQuery = pool.query
  let captured
  pool.query = async (sql, params) => {
    captured = { sql, params }
    return { rows: [] }
  }
  try {
    let payload
    await listPosts({ user: userId ? { id: userId } : undefined }, { json(value) { payload = value } }, (error) => { throw error })
    assert.deepEqual(payload, [])
    return captured
  } finally {
    pool.query = originalQuery
  }
}

test('anonymous feed requires both a public account and a public post', async () => {
  const { sql, params } = await captureFeedQuery(null)
  assert.deepEqual(params, [null])
  assert.match(sql, /author_settings\.profile_visibility[\s\S]*=[\s\S]*'public'::visibility/)
  assert.match(sql, /p\.visibility = 'public'::visibility/)
})

test('authenticated feed permits owner and approved follower paths without exposing private posts globally', async () => {
  const viewerId = '92b23ed3-10ba-4fd5-975a-a46c18709404'
  const { sql, params } = await captureFeedQuery(viewerId)
  assert.deepEqual(params, [viewerId])
  assert.match(sql, /p\.author_id = \$1::uuid/)
  assert.match(sql, /approved\.follower_id = \$1::uuid AND approved\.followed_id = p\.author_id/)
  assert.match(sql, /p\.visibility IN \('public'::visibility, 'followers'::visibility\)/)
  assert.match(sql, /p\.visibility = 'friends'::visibility/)
  assert.match(sql, /inbound\.follower_id = p\.author_id AND inbound\.followed_id = \$1::uuid/)
})

test('private profile query redacts bio, contact email, and age group for unapproved viewers', async () => {
  const originalQuery = pool.query
  let sql
  pool.query = async (query) => { sql = query; return { rows: [{ id: 'target' }] } }
  try {
    let payload
    await getUserProfile(
      { params: { id: '92b23ed3-10ba-4fd5-975a-a46c18709404' }, user: { id: 'b3f4bdf7-c351-420c-aaa1-ea1c09322381' } },
      { json(value) { payload = value }, status() { return this } },
      (error) => { throw error },
    )
    assert.equal(payload.id, 'target')
    assert.match(sql, /THEN p\.bio ELSE NULL END AS bio/)
    assert.match(sql, /THEN p\.contact_email ELSE NULL END AS contact_email/)
    assert.match(sql, /THEN p\.age_group ELSE NULL END AS age_group/)
  } finally { pool.query = originalQuery }
})

test('notification feed derives persistent follow-request state and actor avatar', async () => {
  const originalQuery = pool.query
  let sql
  pool.query = async (query) => { sql = query; return { rows: [] } }
  try {
    await listNotifications({ query: {}, user: { id: '92b23ed3-10ba-4fd5-975a-a46c18709404' } }, { json() {} }, (error) => { throw error })
    assert.match(sql, /fr\.status::text AS follow_request_status/)
    assert.match(sql, /actor_avatar\.storage_path AS actor_avatar_url/)
    assert.match(sql, /n\.data->>'accepted'/)
  } finally { pool.query = originalQuery }
})

test('accepting a follow request persists notification completion in the same transaction', async () => {
  const originalConnect = pool.connect
  const originalQuery = pool.query
  const statements = []
  const client = {
    async query(sql) {
      statements.push(sql)
      if (/UPDATE friend_requests/.test(sql)) return { rows: [{ sender_id: '92b23ed3-10ba-4fd5-975a-a46c18709404' }] }
      return { rows: [], rowCount: 1 }
    },
    release() {},
  }
  pool.connect = async () => client
  pool.query = async () => ({ rows: [] })
  try {
    let payload
    await acceptFollowRequest(
      { params: { requestId: 'b3f4bdf7-c351-420c-aaa1-ea1c09322381' }, user: { id: '60faa977-6543-463d-ac64-1169bd1da81b' } },
      { json(value) { payload = value }, status() { return this } },
      (error) => { throw error },
    )
    assert.deepEqual(payload, { status: 'accepted' })
    assert.ok(statements.some((sql) => /UPDATE notifications[\s\S]*"accepted":true/.test(sql)))
  } finally {
    pool.connect = originalConnect
    pool.query = originalQuery
  }
})
