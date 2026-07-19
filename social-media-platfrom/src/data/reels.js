import { SAMPLE_VIDEOS } from './posts'
import { USERS } from './users'

// Instagram-Reels-style vertical short videos. Only 2 real source clips ship
// with the demo media pack, so they're cycled with distinct captions/authors.
export const REELS = [
  {
    id: 'r1',
    src: SAMPLE_VIDEOS[0],
    author: USERS[0],
    caption: 'Volcano project time-lapse 🌋 so proud of how this turned out!',
    tag: 'Educational',
    likes: 342,
    comments: [
      { id: 'rc1', author: 'Leo P.', text: 'This is so cool!' },
      { id: 'rc2', author: 'Zoe H.', text: 'Teach me your ways 😍' },
    ],
  },
  {
    id: 'r2',
    src: SAMPLE_VIDEOS[1],
    author: USERS[1],
    caption: '5-minute kindness challenge — try this with a friend today 💚',
    tag: 'Wellness',
    likes: 518,
    comments: [{ id: 'rc3', author: 'Aiden K.', text: 'Doing this right now!' }],
  },
  {
    id: 'r3',
    src: SAMPLE_VIDEOS[0],
    author: USERS[3],
    caption: 'DIY friendship bracelets, step by step ✨',
    tag: 'DIY',
    likes: 271,
    comments: [{ id: 'rc4', author: 'Nina T.', text: 'Adding this to my list!' }],
  },
  {
    id: 'r4',
    src: SAMPLE_VIDEOS[1],
    author: USERS[6],
    caption: 'Quick breathing exercise before your next test 🧘',
    tag: 'Wellness',
    likes: 604,
    comments: [{ id: 'rc5', author: 'Maya R.', text: 'Needed this today.' }],
  },
  {
    id: 'r5',
    src: SAMPLE_VIDEOS[0],
    author: USERS[5],
    caption: 'Robotics practice highlights from this week 🤖',
    tag: 'STEM',
    likes: 189,
    comments: [],
  },
]
