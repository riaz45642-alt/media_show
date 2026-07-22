import { SAMPLE_PHOTOS, SAMPLE_VIDEOS } from './posts'
import { USERS } from './users'

let sid = 0
const nextStoryId = () => `story-${++sid}`

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString()

// A couple of demo stories per user with a story, so the feature feels
// alive immediately without requiring anyone to upload first.
export function seedStories() {
  const seed = {}
  USERS.filter((u) => u.hasStory).forEach((u, idx) => {
    seed[u.id] = [
      {
        id: nextStoryId(),
        type: 'image',
        src: SAMPLE_PHOTOS[idx % SAMPLE_PHOTOS.length],
        createdAt: hoursAgo(idx + 1),
        likedByMe: false,
        likes: Math.floor(Math.random() * 20) + 2,
      },
      ...(idx % 3 === 0
        ? [
            {
              id: nextStoryId(),
              type: 'video',
              src: SAMPLE_VIDEOS[idx % SAMPLE_VIDEOS.length],
              createdAt: hoursAgo(idx + 0.5),
              likedByMe: false,
              likes: Math.floor(Math.random() * 15) + 1,
            },
          ]
        : []),
    ]
  })
  return seed
}
