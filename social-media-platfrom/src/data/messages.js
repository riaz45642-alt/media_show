import { USERS } from './users'

// Lightweight mock chat dataset powering the Instagram-style DM system.
// Each conversation is keyed by the *other* participant's user id so it's
// trivial to "find or create" a thread when sharing content or tapping
// "Message" from a profile. Everything lives in memory (session-only),
// matching the rest of the app's mock-data conventions.

let msgSeq = 0
export function nextMessageId() {
  msgSeq += 1
  return `m-${Date.now()}-${msgSeq}`
}

// message.type: 'text' | 'image' | 'video' | 'link' | 'shared'
// message.shared.kind: 'post' | 'reel' | 'video' | 'story' | 'profile'
// message.status: 'sent' | 'delivered' | 'seen'
export const SEED_CONVERSATIONS = [
  {
    id: 'u1',
    participantId: 'u1',
    pinned: true,
    archived: false,
    messages: [
      { id: 'seed-1', senderId: 'u1', type: 'text', text: "Don't forget notes for tomorrow!", time: iso(-1440), status: 'seen' },
      { id: 'seed-2', senderId: 'u1', type: 'text', text: 'See you at the library!', time: iso(-120), status: 'seen' },
      { id: 'seed-3', senderId: 'me', type: 'text', text: 'Sounds good, bringing snacks too 🍪', time: iso(-115), status: 'seen' },
    ],
  },
  {
    id: 'u2',
    participantId: 'u2',
    pinned: false,
    archived: false,
    messages: [
      { id: 'seed-4', senderId: 'u2', type: 'text', text: 'That volcano project was awesome', time: iso(-300), status: 'seen' },
      { id: 'seed-5', senderId: 'me', type: 'text', text: 'Thank you! Yours too 🌋', time: iso(-295), status: 'seen' },
    ],
  },
  {
    id: 'u6',
    participantId: 'u6',
    pinned: false,
    archived: false,
    messages: [
      { id: 'seed-6', senderId: 'u6', type: 'text', text: 'Practice moved to Friday', time: iso(-1400), status: 'delivered' },
    ],
  },
  {
    id: 'u4',
    participantId: 'u4',
    pinned: false,
    archived: false,
    messages: [
      { id: 'seed-7', senderId: 'u4', type: 'text', text: 'Loved your last post! 💚', time: iso(-4000), status: 'seen' },
    ],
  },
  {
    id: 'u7',
    participantId: 'u7',
    pinned: false,
    archived: true,
    messages: [
      { id: 'seed-8', senderId: 'u7', type: 'text', text: 'Thanks for the tips!', time: iso(-9000), status: 'seen' },
    ],
  },
]

function iso(minutesAgo) {
  return new Date(Date.now() + minutesAgo * 60000).toISOString()
}

export const CANNED_REPLIES = [
  'Got it, thanks! 😊',
  "That's awesome!",
  'Haha true 😄',
  'Sounds good to me!',
  "I'll check it out ✨",
  'Omg yes 🙌',
  'Sure, see you then!',
]

export function findUser(userId) {
  return USERS.find((u) => u.id === userId)
}
