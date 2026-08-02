import test from 'node:test'
import assert from 'node:assert/strict'
import { runRuleBasedFilter } from '../src/services/ruleBasedFilter.js'
import { computeDecision } from '../src/services/riskEngine.js'
import {
  PERSISTED_MODERATION_STATUSES,
  validateModerationDecision,
} from '../src/services/moderationService.js'
import { decideMediaModeration, parseMediaJson } from '../src/services/geminiService.js'

test('ordinary greetings and names are not flagged by rules', () => {
  for (const text of ['Hello', 'Ahmed', 'Hi there', 'Good morning']) {
    assert.deepEqual(runRuleBasedFilter({ text }), { blocked: false, riskPoints: 0, flags: [] })
  }
})

test('keywords only match complete words, not harmless substrings', () => {
  for (const text of ['classmate', 'skillful', 'therapist', 'method']) {
    assert.equal(runRuleBasedFilter({ text }).riskPoints, 0)
  }
})

test('explicitly abusive language receives rule risk', () => {
  const result = runRuleBasedFilter({ text: 'You are stupid and ugly' })
  assert.ok(result.riskPoints >= 50)
  assert.ok(result.flags.includes('offensive_or_hate_keyword'))
})

test('low-risk model output remains safe', () => {
  const decision = computeDecision({
    ruleResult: { blocked: false, riskPoints: 0, flags: [] },
    textAi: { available: true, overall_score: 3, categories: {}, primary_concern: null },
  })
  assert.equal(decision.status, 'safe')
})

test('moderation decisions only persist values supported by moderation_state', () => {
  assert.deepEqual(PERSISTED_MODERATION_STATUSES, ['safe', 'flagged', 'rejected'])
  for (const status of PERSISTED_MODERATION_STATUSES) {
    assert.equal(validateModerationDecision({ status }).status, status)
  }
  assert.throws(
    () => validateModerationDecision({ status: 'approved' }),
    (error) => error.code === 'INVALID_MODERATION_STATUS'
  )
})

test('safe everyday image classifications remain accepted', () => {
  for (const reason of ['mountain landscape', 'Batman cartoon', 'family photo', 'cat', 'football']) {
    const decision = decideMediaModeration({ available: true, safe: true, reason, categories: [], confidence: 0.99 })
    assert.equal(decision.safe, true)
  }
})

test('low-confidence or non-prohibited visual findings do not reject uploads', () => {
  assert.equal(decideMediaModeration({ available: true, safe: false, reason: 'uncertain', categories: ['nudity'], confidence: 0.6 }).safe, true)
  assert.equal(decideMediaModeration({ available: true, safe: false, reason: 'fictional weapon', categories: ['weapon'], confidence: 0.99 }).safe, true)
})

test('high-confidence explicit content is rejected', () => {
  const decision = decideMediaModeration({ available: true, safe: false, reason: 'explicit nudity', categories: ['nudity'], confidence: 0.96 })
  assert.equal(decision.safe, false)
  assert.deepEqual(decision.categories, ['nudity'])
})

test('invalid Gemini media payloads fail parsing instead of becoming adult content', () => {
  assert.throws(() => parseMediaJson('{"reason":"unknown","categories":[]}'), /safe must be boolean/)
})
