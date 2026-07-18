import photo1 from '../assets/media/photo-1.jpeg'
import photo2 from '../assets/media/photo-2.jpg'
import photo3 from '../assets/media/photo-3.jpg'
import photo4 from '../assets/media/photo-4.jpg'
import photo5 from '../assets/media/photo-5.jpg'
import photo6 from '../assets/media/photo-6.jpg'
import photo7 from '../assets/media/photo-7.jpg'
import video1 from '../assets/media/video-1.mp4'
import video2 from '../assets/media/video-2.mp4'

// Sample content library (from the reference design's media pack) reused
// across the feed, explore grid, and demo profile grid.
export const SAMPLE_PHOTOS = [photo1, photo2, photo3, photo4, photo5, photo6, photo7]
export const SAMPLE_VIDEOS = [video1, video2]

// Seed feed — a realistic mix of text, image, video & mixed-media posts.
export const POSTS = [
  {
    id: 'p1',
    author: 'Maya R.',
    avatarColor: '#4A90E2',
    time: '2h ago',
    type: 'image',
    text: 'Finished my volcano science project today! Learned so much about chemical reactions. 🌋',
    media: [{ type: 'image', src: photo2 }],
    likes: 128,
    comments: [
      { id: 'c1', author: 'Leo P.', text: 'This looks amazing! 🔥' },
      { id: 'c2', author: 'Zoe H.', text: 'Great work on this!' },
    ],
    tag: 'Science',
    safe: true,
  },
  {
    id: 'p2',
    author: 'Leo P.',
    avatarColor: '#2ECC71',
    time: '4h ago',
    type: 'text',
    text: 'Did the Daily Kindness Challenge — helped my neighbor carry groceries. Small things matter! 💚',
    media: [],
    likes: 96,
    comments: [{ id: 'c3', author: 'Aiden K.', text: 'Love this energy!' }],
    tag: 'Kindness',
    safe: true,
  },
  {
    id: 'p3',
    author: 'Aiden K.',
    avatarColor: '#F1C40F',
    time: '6h ago',
    type: 'mixed',
    text: 'Sharing my sketchbook pages from art class this week — feedback welcome!',
    media: [
      { type: 'image', src: photo3 },
      { type: 'image', src: photo4 },
      { type: 'image', src: photo1 },
    ],
    likes: 210,
    comments: [
      { id: 'c4', author: 'Maya R.', text: 'The shading is so good!' },
    ],
    tag: 'Art',
    safe: true,
  },
  {
    id: 'p4',
    author: 'Zoe H.',
    avatarColor: '#4A90E2',
    time: '1d ago',
    type: 'video',
    text: 'Our robotics team qualified for regionals! So proud of everyone. 🤖',
    media: [{ type: 'video', src: video1 }],
    likes: 340,
    comments: [
      { id: 'c5', author: 'Leo P.', text: 'Congratulations team!!' },
      { id: 'c6', author: 'Aiden K.', text: 'So well deserved 🎉' },
    ],
    tag: 'Achievement',
    safe: true,
  },
  {
    id: 'p5',
    author: 'Nina S.',
    avatarColor: '#2ECC71',
    time: '1d ago',
    type: 'image',
    text: 'Golden hour walk after finishing homework early. Highly recommend the break! ☀️',
    media: [{ type: 'image', src: photo5 }],
    likes: 87,
    comments: [],
    tag: 'Wellness',
    safe: true,
  },
  {
    id: 'p6',
    author: 'Aiden K.',
    avatarColor: '#F1C40F',
    time: '2d ago',
    type: 'video',
    text: 'Quick clip from our weekend hiking trip with the family 🥾🌲',
    media: [{ type: 'video', src: video2 }],
    likes: 156,
    comments: [{ id: 'c7', author: 'Nina S.', text: 'Looks so peaceful!' }],
    tag: 'Outdoors',
    safe: true,
  },
]

export const QUOTES = [
  { id: 'q1', text: 'Small steps every day lead to big changes.', author: 'SafeZone Team' },
  { id: 'q2', text: 'Be the reason someone smiles today.', author: 'Daily Kindness' },
  { id: 'q3', text: 'Mistakes are proof that you are trying.', author: 'Growth Mindset' },
]

export const CHALLENGES = [
  { id: 'c1', title: 'Compliment a friend', points: 10, done: false },
  { id: 'c2', title: 'Help with a chore at home', points: 15, done: false },
  { id: 'c3', title: 'Write down 3 things you are grateful for', points: 10, done: true },
]

// A few demo posts already "owned" by the signed-in user, so the new
// Instagram-style profile grid has content to show out of the box.
export const MY_SEED_POSTS = [
  {
    id: 'mp1',
    author: 'You',
    avatarColor: '#4A90E2',
    time: '3d ago',
    type: 'image',
    text: 'Weekend project turned out great!',
    media: [{ type: 'image', src: photo6 }],
    likes: 42,
    comments: [],
    tag: 'DIY',
    safe: true,
    own: true,
  },
  {
    id: 'mp2',
    author: 'You',
    avatarColor: '#4A90E2',
    time: '5d ago',
    type: 'image',
    text: 'Coffee, sunshine & a good book. 📚',
    media: [{ type: 'image', src: photo7 }],
    likes: 65,
    comments: [],
    tag: 'Lifestyle',
    safe: true,
    own: true,
  },
]
