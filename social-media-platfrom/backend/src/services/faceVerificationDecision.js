export function evaluateFaceVerification(result) {
  if (!result?.available) {
    return { verified: false, code: 'provider_unavailable', reason: result?.reason || 'verification_unavailable' }
  }
  if (!result.face_present) return { verified: false, code: 'no_face', reason: 'No face was clearly detected in both frames.' }
  if (!result.single_face) return { verified: false, code: 'multiple_faces', reason: 'Exactly one face must be visible.' }
  if (!result.face_clear) return { verified: false, code: 'poor_quality', reason: 'The face is blurred, obscured, or poorly lit.' }
  if (!result.pose_changed) return { verified: false, code: 'no_pose_change', reason: 'No clear head movement was detected.' }
  if (result.likely_photo_of_photo_or_screen) {
    return { verified: false, code: 'replay_suspected', reason: 'A photo or screen replay may be present.' }
  }
  if (result.confidence < 45) return { verified: false, code: 'low_confidence', reason: 'Face confidence was too low.' }
  return { verified: true, code: 'verified', reason: null }
}
