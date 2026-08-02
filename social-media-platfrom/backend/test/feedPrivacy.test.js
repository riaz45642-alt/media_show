import test from 'node:test'
import assert from 'node:assert/strict'
import { pool } from '../src/config/db.js'
import { listPosts } from '../src/controllers/postController.js'

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
