import { createContext, useContext, useMemo, useState } from 'react'
import { seedStories } from '../data/stories'

const StoriesContext = createContext(null)

let sid = 0
const nextId = () => `mystory-${Date.now()}-${++sid}`

export function StoriesProvider({ children }) {
  const [storiesByUser, setStoriesByUser] = useState(() => seedStories())
  // 'me' stories are kept separately so they always render first, and
  // survive being added mid-session without touching the seed data.
  const [myStories, setMyStories] = useState([])
  const [viewed, setViewed] = useState(() => new Set())
  const [activeEntryId, setActiveEntryId] = useState(null)

  const addStory = ({ type, src }) => {
    const story = { id: nextId(), type, src, createdAt: new Date().toISOString(), likedByMe: false, likes: 0, mine: true }
    setMyStories((prev) => [...prev, story])
    return story
  }

  const markViewed = (storyId) => setViewed((prev) => new Set(prev).add(storyId))

  const toggleLikeStory = (userId, storyId) => {
    const update = (list) =>
      list.map((s) =>
        s.id === storyId ? { ...s, likedByMe: !s.likedByMe, likes: s.likedByMe ? s.likes - 1 : s.likes + 1 } : s
      )
    if (userId === 'me') {
      setMyStories(update)
    } else {
      setStoriesByUser((prev) => ({ ...prev, [userId]: update(prev[userId] || []) }))
    }
  }

  const getStories = (userId) => (userId === 'me' ? myStories : storiesByUser[userId] || [])

  const hasUnseen = (userId) => getStories(userId).some((s) => !viewed.has(s.id))

  const value = useMemo(
    () => ({
      storiesByUser,
      myStories,
      addStory,
      markViewed,
      toggleLikeStory,
      getStories,
      hasUnseen,
      viewed,
      activeEntryId,
      setActiveEntryId,
    }),
    [storiesByUser, myStories, viewed, activeEntryId]
  )

  return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>
}

export const useStories = () => useContext(StoriesContext)
