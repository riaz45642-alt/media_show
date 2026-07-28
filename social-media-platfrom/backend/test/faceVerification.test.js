import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateFaceVerification } from '../src/services/faceVerificationDecision.js'

const valid = {
  available: true,
  face_present: true,
  single_face: true,
  face_clear: true,
  pose_changed: true,
  likely_photo_of_photo_or_screen: false,
  confidence: 80,
}

test('accepts a clear single face with movement evidence', () => {
  assert.equal(evaluateFaceVerification(valid).verified, true)
})

test('rejects missing, multiple, unclear, static, and replayed faces', () => {
  const cases = [
    [{ ...valid, face_present: false }, 'no_face'],
    [{ ...valid, single_face: false }, 'multiple_faces'],
    [{ ...valid, face_clear: false }, 'poor_quality'],
    [{ ...valid, pose_changed: false }, 'no_pose_change'],
    [{ ...valid, likely_photo_of_photo_or_screen: true }, 'replay_suspected'],
  ]
  for (const [input, code] of cases) assert.equal(evaluateFaceVerification(input).code, code)
})
