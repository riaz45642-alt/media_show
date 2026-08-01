import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

const StoriesContext = createContext(null)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('mediashow_token')}` })
const normalize = (row, ownId) => ({ id: row.id, authorId: row.author_id, type: row.media_type, src: row.media_url, caption: row.caption || '', createdAt: row.created_at, expiresAt: row.expires_at, likedByMe: Boolean(row.liked_by_me), likes: Number(row.like_count || 0), viewed: Boolean(row.viewed), mine: row.author_id === ownId })

export function StoriesProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  const [storiesByUser, setStoriesByUser] = useState({})
  const [authors, setAuthors] = useState({})
  const [activeEntryId, setActiveEntryId] = useState(null)
  const [error, setError] = useState('')

  const refreshStories = useCallback(async () => {
    if (!userId) { setStoriesByUser({}); return }
    const response = await fetch(`${API_URL}/stories`, { headers: headers() })
    const data = await response.json().catch(() => ([]))
    if (!response.ok) throw new Error(data.message || 'Unable to load stories.')
    const grouped = {}
    const nextAuthors = {}
    for (const row of data) {
      ;(grouped[row.author_id] ||= []).push(normalize(row, userId))
      nextAuthors[row.author_id] = { id: row.author_id, name: row.author_name, username: row.username, avatar: row.author_avatar }
    }
    setStoriesByUser(grouped); setAuthors(nextAuthors); setError('')
  }, [userId])

  useEffect(() => { refreshStories().catch((requestError) => setError(requestError.message)) }, [refreshStories])

  const addStory = useCallback(async ({ file, caption = '' }) => {
    const body = new FormData(); body.append('media', file); body.append('caption', caption)
    const response = await fetch(`${API_URL}/stories`, { method: 'POST', headers: headers(), body })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.reason || data.message || 'Unable to upload story.')
    await refreshStories()
    return data
  }, [refreshStories])

  const markViewed = useCallback(async (storyId) => {
    setStoriesByUser((previous) => Object.fromEntries(Object.entries(previous).map(([id, stories]) => [id, stories.map((story) => story.id === storyId ? { ...story, viewed: true } : story)])))
    await fetch(`${API_URL}/stories/${storyId}/view`, { method: 'POST', headers: headers() }).catch(() => {})
  }, [])

  const toggleLikeStory = useCallback(async (_userId, storyId) => {
    setStoriesByUser((previous) => Object.fromEntries(Object.entries(previous).map(([id, stories]) => [id, stories.map((story) => story.id === storyId ? { ...story, likedByMe: !story.likedByMe, likes: story.likes + (story.likedByMe ? -1 : 1) } : story)])))
    await fetch(`${API_URL}/stories/${storyId}/like`, { method: 'POST', headers: headers() })
  }, [])

  const getStories = useCallback((id) => storiesByUser[id === 'me' ? userId : id] || [], [storiesByUser, userId])
  const myStories = getStories('me')
  const viewed = useMemo(() => new Set(Object.values(storiesByUser).flat().filter((story) => story.viewed).map((story) => story.id)), [storiesByUser])
  const hasUnseen = useCallback((id) => getStories(id).some((story) => !story.viewed), [getStories])
  const value = useMemo(() => ({ storiesByUser, authors, myStories, addStory, markViewed, toggleLikeStory, getStories, hasUnseen, viewed, activeEntryId, setActiveEntryId, refreshStories, error }), [storiesByUser, authors, myStories, addStory, markViewed, toggleLikeStory, getStories, hasUnseen, viewed, activeEntryId, refreshStories, error])
  return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>
}

export const useStories = () => useContext(StoriesContext)
