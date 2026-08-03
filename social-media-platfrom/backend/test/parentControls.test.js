import test from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { screenTimeLimitReached, validParentHash, validParentPassword, verifyParentPassword } from '../src/services/parentControlService.js'

test('parent password existence only accepts a real bcrypt hash', () => {
  assert.equal(validParentHash(null), false)
  assert.equal(validParentHash(''), false)
  assert.equal(validParentHash('already-configured'), false)
  assert.equal(validParentHash('$2b$12$abcdefghijklmnopqrstuu1234567890123456789012345678901'), true)
})

test('parent password creation validates secure supported lengths', () => {
  assert.equal(validParentPassword('short'), false)
  assert.equal(validParentPassword('12345678'), true)
  assert.equal(validParentPassword('x'.repeat(129)), false)
})

test('parent password verification accepts the right password and rejects wrong or malformed hashes', async () => {
  const hash = await bcrypt.hash('parent-secret', 4)
  assert.equal(await verifyParentPassword('parent-secret', hash), true)
  assert.equal(await verifyParentPassword('wrong-secret', hash), false)
  assert.equal(await verifyParentPassword('parent-secret', 'legacy-placeholder'), false)
})

test('daily screen time reaches the limit exactly and resets with a new daily usage row', () => {
  assert.equal(screenTimeLimitReached(null, 99999), false)
  assert.equal(screenTimeLimitReached(60, 3599), false)
  assert.equal(screenTimeLimitReached(60, 3600), true)
  assert.equal(screenTimeLimitReached(60, 0), false)
})
