// Maps a numeric age to a content-filtering tier used across the app.
// Kept simple + backend-ready: the same tiers should be enforced server-side.
export const AGE_TIERS = {
  KIDS: 'kids',
  TEEN: 'teen',
  ADULT: 'adult',
}

export function getAgeGroup(age) {
  const n = Number(age)
  if (Number.isNaN(n)) return AGE_TIERS.TEEN
  if (n < 13) return AGE_TIERS.KIDS
  if (n < 18) return AGE_TIERS.TEEN
  return AGE_TIERS.ADULT
}

export const AGE_GROUP_LABEL = {
  [AGE_TIERS.KIDS]: 'Kids Mode',
  [AGE_TIERS.TEEN]: 'Teen Mode',
  [AGE_TIERS.ADULT]: 'Adult Mode',
}

export const AGE_GROUP_DESC = {
  [AGE_TIERS.KIDS]: 'Strictest filtering. Only curated, educational & fully moderated content.',
  [AGE_TIERS.TEEN]: 'Balanced filtering. Age-appropriate posts, videos & articles.',
  [AGE_TIERS.ADULT]: 'Standard filtering. Full access with Smart Ethical Shield active.',
}
