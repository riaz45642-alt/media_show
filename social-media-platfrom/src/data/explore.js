import { SAMPLE_PHOTOS, SAMPLE_VIDEOS } from './posts'

const CAPTIONS = [
  'Chasing golden light this evening ✨',
  'Behind the scenes of today\'s project',
  'A calm moment before the weekend',
  'Small wins deserve celebration too 🎉',
  'Learning something new every day',
  'Grateful for this community 💛',
  'Weekend adventures with friends',
  'Studio session, take two',
  'Nature always knows how to reset us 🌿',
  'Proud of how this turned out',
]

const TAGS = ['Educational', 'Wellness', 'STEM', 'Safety', 'DIY', 'Art', 'Outdoors', 'Kindness']

// Deterministic pseudo-random generator so pagination/infinite-scroll
// produces stable, repeatable "new" items without needing a backend.
function seededRandom(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function generateExploreItems(page, pageSize = 12) {
  const rand = seededRandom(page * 977 + 13)
  const items = []
  for (let i = 0; i < pageSize; i++) {
    const isVideo = rand() > 0.72
    const media = isVideo
      ? SAMPLE_VIDEOS[Math.floor(rand() * SAMPLE_VIDEOS.length)]
      : SAMPLE_PHOTOS[Math.floor(rand() * SAMPLE_PHOTOS.length)]
    const idx = page * pageSize + i
    items.push({
      id: `ex-${page}-${i}`,
      type: isVideo ? 'video' : 'image',
      src: media,
      caption: CAPTIONS[idx % CAPTIONS.length],
      tag: TAGS[idx % TAGS.length],
      likes: 40 + Math.floor(rand() * 900),
      comments: 2 + Math.floor(rand() * 60),
      // tall / short tiles create the Pinterest-style masonry rhythm
      tall: rand() > 0.55,
    })
  }
  return items
}
