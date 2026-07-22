import { SAMPLE_PHOTOS } from './posts'

// Lightweight mock "social graph" used to power Stories, Followers/Following,
// and account-privacy demos entirely on the client (no backend user table
// wired up yet — swap for real API calls when ready).
export const USERS = [
  { id: 'u1', name: 'Maya R.', color: '#4A90E2', avatar: SAMPLE_PHOTOS[1], isPrivate: false, hasStory: true, isOnline: true, gender: 'female' },
  { id: 'u2', name: 'Leo P.', color: '#2ECC71', avatar: SAMPLE_PHOTOS[2], isPrivate: false, hasStory: true, isOnline: true, gender: 'male' },
  { id: 'u3', name: 'Aiden K.', color: '#F1C40F', avatar: SAMPLE_PHOTOS[3], isPrivate: true, hasStory: true, isOnline: false, gender: 'male' },
  { id: 'u4', name: 'Zoe H.', color: '#E67E22', avatar: SAMPLE_PHOTOS[4], isPrivate: false, hasStory: true, isOnline: true, gender: 'female' },
  { id: 'u5', name: 'Study Group', color: '#9B59B6', avatar: SAMPLE_PHOTOS[5], isPrivate: false, hasStory: false, isOnline: false, gender: '' },
  { id: 'u6', name: 'Robotics Team', color: '#1ABC9C', avatar: SAMPLE_PHOTOS[6], isPrivate: true, hasStory: true, isOnline: false, gender: '' },
  { id: 'u7', name: 'Nina T.', color: '#E74C3C', avatar: SAMPLE_PHOTOS[0], isPrivate: false, hasStory: true, isOnline: true, gender: 'female' },
]

// Followers/following lists for the "current user" (id: 'me') — id 'u3' and
// 'u6' are private accounts the current user is already an approved
// follower of, so they should still be viewable.
export const FOLLOWERS = USERS.filter((u) => ['u1', 'u2', 'u4', 'u5', 'u7'].includes(u.id))
export const FOLLOWING = USERS.filter((u) => ['u1', 'u3', 'u5', 'u6'].includes(u.id))

// Any account not in this set is treated as "not an approved follower" for
// the private-account view-gating demo.
export const APPROVED_FOLLOWER_IDS = new Set(FOLLOWERS.map((u) => u.id))
