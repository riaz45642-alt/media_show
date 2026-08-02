import test from 'node:test'
import assert from 'node:assert/strict'
import { runRuleBasedFilter } from '../src/services/ruleBasedFilter.js'
import { computeDecision } from '../src/services/riskEngine.js'
import {
  PERSISTED_MODERATION_STATUSES,
  validateModerationDecision,
} from '../src/services/moderationService.js'
import {
  decideChildIntimacyModeration,
  decideMediaModeration,
  parseChildIntimacyJson,
  parseMediaJson,
  unavailableMediaResult,
} from '../src/services/geminiService.js'
import {
  interpretSightengineHttpResponse,
  normalizeSightengineRequestError,
  normalizeSightengineResponse,
} from '../src/services/sightengineService.js'
import { combineModerationDecisions, shouldRunSecondAiCheck } from '../src/services/mediaModerationService.js'

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
  assert.equal(decideMediaModeration({ available: true, safe: false, reason: 'uncertain', categories: ['nudity'], confidence: 0.25 }).safe, true)
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

test('quota, timeout, and provider failures are unavailable rather than unsafe', () => {
  for (const reason of ['gemini_http_429', 'gemini_timeout', 'gemini_call_failed', 'gemini_http_503']) {
    const result = unavailableMediaResult(reason)
    assert.equal(result.available, false)
    assert.equal(result.safe, null)
    assert.deepEqual(result.categories, [])
  }
})

test('Sightengine allows results below the high-confidence threshold', () => {
  const result = normalizeSightengineResponse({
    status: 'success', nudity: { sexual_activity: 0.2, sexual_display: 0.1, erotica: 0.3 },
    gore: { prob: 0.2 }, weapon: { classes: { firearm: 0.2 } }, violence: { prob: 0.1 },
    recreational_drug: { prob: 0.2 }, offensive: { nazi: 0.1 },
  })
  assert.equal(result.available, true)
  assert.equal(result.safe, true)
  assert.deepEqual(result.categories, [])
})

test('Sightengine rejects high-confidence prohibited image results', () => {
  const result = normalizeSightengineResponse({
    status: 'success', nudity: { sexual_activity: 0.93 }, gore: { prob: 0.1 },
    weapon: { classes: { firearm: 0.2 } }, violence: { prob: 0.2 },
    recreational_drug: { prob: 0.1 }, offensive: { nazi: 0.1 },
  })
  assert.equal(result.safe, false)
  assert.ok(result.confidence >= 0.35)
  assert.deepEqual(result.categories, ['sexual_activity'])
})

test('Sightengine provider failures are unavailable, never unsafe', () => {
  const result = normalizeSightengineResponse({ status: 'failure', error: { type: 'rate_limit' } })
  assert.equal(result.available, false)
  assert.equal(result.safe, null)
})

test('Sightengine accepts a successful safe image response even without a status envelope', () => {
  const result = normalizeSightengineResponse({
    nudity: { sexual_activity: 0.01, sexual_display: 0.02, erotica: 0.03 },
    gore: { prob: 0.01 }, weapon: { classes: { firearm: 0.01 } }, violence: { prob: 0.01 },
    recreational_drug: { prob: 0.01 }, offensive: { nazi: 0.01 },
  })
  assert.equal(result.available, true)
  assert.equal(result.safe, true)
})

test('Sightengine rejects high-confidence gore', () => {
  const result = normalizeSightengineResponse({ status: 'success', gore: { prob: 0.94 } })
  assert.equal(result.available, true)
  assert.equal(result.safe, false)
  assert.deepEqual(result.categories, ['gore'])
})

test('Sightengine blocks suggestive child-sensitive classes at the strict threshold', () => {
  for (const payload of [
    { nudity: { very_suggestive: 0.36 } },
    { nudity: { suggestive: 0.4 } },
    { nudity: { lingerie: 0.42 } },
  ]) {
    const result = normalizeSightengineResponse({ status: 'success', ...payload })
    assert.equal(result.available, true)
    assert.equal(result.safe, false)
  }
})

test('every Sightengine-safe result is routed to Gemini', () => {
  assert.equal(shouldRunSecondAiCheck({ available: true, safe: true, confidence: 0.25 }), true)
  assert.equal(shouldRunSecondAiCheck({ available: true, safe: true, confidence: 0.05 }), true)
  assert.equal(shouldRunSecondAiCheck({ available: true, safe: false, confidence: 0.5 }), false)
})

test('Gemini child-intimacy response uses the strict three-field provider schema', () => {
  const parsed = parseChildIntimacyJson('{"safe":false,"reason":"romantic kissing","confidence":0.82}')
  assert.equal(parsed.available, true)
  assert.equal(parsed.safe, false)
  assert.equal(parsed.confidence, 0.82)
})

test('Gemini child-intimacy decision rejects only at confidence 0.60 or above', () => {
  assert.equal(decideChildIntimacyModeration({ available: true, safe: false, reason: 'kiss', confidence: 0.59, categories: [] }).safe, true)
  const rejected = decideChildIntimacyModeration({ available: true, safe: false, reason: 'kiss', confidence: 0.60, categories: [] })
  assert.equal(rejected.safe, false)
  assert.deepEqual(rejected.categories, ['romantic_intimacy'])
})

test('AI Vision can reject near-threshold child-inappropriate intimacy', () => {
  const result = combineModerationDecisions(
    { available: true, safe: true, confidence: 0.28, categories: [], modelCategories: { suggestive: 0.28 } },
    { available: true, safe: false, confidence: 0.91, reason: 'Making out detected', categories: ['making_out'] },
  )
  assert.equal(result.safe, false)
  assert.equal(result.rejectedBy, 'AI Vision')
  assert.deepEqual(result.categories, ['making_out'])
})

test('AI Vision outage gracefully preserves Sightengine safe decision', () => {
  const result = combineModerationDecisions(
    { available: true, safe: true, confidence: 0.25, categories: [] },
    { available: false, safe: null, reason: 'gemini_http_429', categories: [], confidence: null },
  )
  assert.equal(result.available, true)
  assert.equal(result.safe, true)
  assert.equal(result.secondaryModeration.available, false)
})

for (const [name, status, payload, expectedReason] of [
  ['invalid API credentials', 401, { status: 'failure', error: { type: 'credentials_error', code: 1, message: 'Invalid credentials' } }, 'credentials_error'],
  ['invalid model', 400, { status: 'failure', error: { type: 'argument_error', code: 2, message: 'Unknown model' } }, 'argument_error'],
  ['HTTP 400', 400, { status: 'failure', error: { type: 'request_error', code: 3, message: 'Bad request' } }, 'http_400'],
  ['HTTP 401', 401, { status: 'failure', error: { type: 'credentials_error', message: 'Unauthorized' } }, 'http_401'],
  ['HTTP 403', 403, { status: 'failure', error: { type: 'plan_error', message: 'Forbidden' } }, 'http_403'],
  ['HTTP 429', 429, { status: 'failure', error: { type: 'usage_limit', message: 'Rate limited' } }, 'http_429'],
  ['unsupported file', 400, { status: 'failure', error: { type: 'media_error', code: 4, message: 'Unsupported file' } }, 'media_error'],
]) {
  test(`Sightengine ${name} remains unavailable and preserves provider diagnostics`, () => {
    const result = interpretSightengineHttpResponse(status, payload)
    assert.equal(result.available, false)
    assert.equal(result.safe, null)
    assert.match(result.reason, new RegExp(expectedReason))
    assert.equal(result.providerError.message, payload.error.message)
  })
}

test('Sightengine timeout remains unavailable', () => {
  const result = normalizeSightengineRequestError(Object.assign(new Error('timeout of 30000ms exceeded'), { code: 'ECONNABORTED' }))
  assert.equal(result.available, false)
  assert.equal(result.safe, null)
  assert.equal(result.reason, 'sightengine_timeout')
})

test('Sightengine parses frame-based safe video responses', () => {
  const result = normalizeSightengineResponse({
    status: 'success',
    data: { frames: [{ info: { position: 0 }, nudity: { sexual_activity: 0.01, sexual_display: 0.01, erotica: 0.01, very_suggestive: 0.02, none: 0.98 } }] },
  }, { mediaType: 'video' })
  assert.equal(result.available, true)
  assert.equal(result.safe, true)
})

test('Sightengine reports unsupported video as a permanent client validation error', () => {
  const result = interpretSightengineHttpResponse(400, {
    status: 'failure', error: { type: 'media_error', code: 4, message: 'Unsupported video codec or format' },
  }, { mediaType: 'video' })
  assert.equal(result.available, false)
  assert.equal(result.safe, null)
  assert.equal(result.validationError, true)
  assert.equal(result.code, 'UNSUPPORTED_VIDEO_FORMAT')
  assert.equal(result.httpStatus, 415)
})

test('Sightengine reports videos beyond the synchronous limit clearly', () => {
  const result = interpretSightengineHttpResponse(400, {
    status: 'failure', error: { type: 'media_error', message: 'Video duration is longer than 60 seconds' },
  }, { mediaType: 'video' })
  assert.equal(result.available, false)
  assert.equal(result.validationError, true)
  assert.equal(result.code, 'VIDEO_DURATION_UNSUPPORTED')
  assert.equal(result.httpStatus, 422)
})

test('Sightengine video rate limits remain temporary provider failures', () => {
  const result = interpretSightengineHttpResponse(429, {
    status: 'failure', error: { type: 'usage_limit', message: 'Rate limited' },
  }, { mediaType: 'video' })
  assert.equal(result.available, false)
  assert.equal(result.safe, null)
  assert.equal(result.validationError, undefined)
})

test('Sightengine malformed JSON/result remains unavailable rather than unsafe', () => {
  for (const payload of [null, 'not-json', {}, []]) {
    const result = normalizeSightengineResponse(payload)
    assert.equal(result.available, false)
    assert.equal(result.safe, null)
  }
})
