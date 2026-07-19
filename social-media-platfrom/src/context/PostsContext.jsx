import { createContext, useContext, useMemo, useState } from 'react'
import { POSTS, MY_SEED_POSTS } from '../data/posts'
import { useAuth } from './AuthContext'

const PostsContext = createContext(null)

let uid = 0
function nextId(prefix) {
  uid += 1
  return `${prefix}-${Date.now()}-${uid}`
}

export function PostsProvider({ children }) {
  const { user } = useAuth()
  // NOTE: uploaded media uses in-memory object URLs (URL.createObjectURL),
  // so posts persist for the session but intentionally are not written to
  // localStorage — object URLs don't survive a page reload.
  const [posts, setPosts] = useState(() => [...MY_SEED_POSTS, ...POSTS])
  // Saved Collections: { id, name, postIds: [] }[] — session-only, like posts above.
  const [collections, setCollections] = useState([
    { id: 'col-default', name: 'All Saved', postIds: [] },
  ])

  const toggleLike = (id) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? p.likes - 1 : p.likes + 1 }
          : p
      )
    )
  }

  const toggleSave = (id) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)))
  }

  const addComment = (id, text) => {
    if (!text?.trim()) return
    const comment = { id: nextId('c'), author: user?.name || 'You', text: text.trim() }
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, comments: [...p.comments, comment] } : p))
    )
  }

  const incrementShare = (id) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, shares: (p.shares || 0) + 1 } : p)))
  }

  const addPost = ({ text, media, type }) => {
    const post = {
      id: nextId('post'),
      author: user?.name || 'You',
      avatarColor: '#4A90E2',
      avatarSrc: user?.avatar || '',
      time: 'Just now',
      type,
      text: text || '',
      media: media || [],
      likes: 0,
      comments: [],
      tag: null,
      safe: true,
      own: true,
    }
    setPosts((prev) => [post, ...prev])
    return post
  }

  const myPosts = useMemo(() => posts.filter((p) => p.own), [posts])
  const savedPosts = useMemo(() => posts.filter((p) => p.saved), [posts])

  const createCollection = (name) => {
    if (!name?.trim()) return
    setCollections((prev) => [...prev, { id: nextId('col'), name: name.trim(), postIds: [] }])
  }

  const renameCollection = (id, name) => {
    if (!name?.trim()) return
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)))
  }

  const deleteCollection = (id) => {
    setCollections((prev) => prev.filter((c) => c.id !== id))
  }

  const addToCollection = (collectionId, postId) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId && !c.postIds.includes(postId)
          ? { ...c, postIds: [...c.postIds, postId] }
          : c
      )
    )
  }

  const removeFromCollection = (collectionId, postId) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === collectionId ? { ...c, postIds: c.postIds.filter((id) => id !== postId) } : c))
    )
  }

  const value = {
    posts,
    myPosts,
    savedPosts,
    collections,
    addPost,
    toggleLike,
    toggleSave,
    addComment,
    incrementShare,
    createCollection,
    renameCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
  }

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
}

export const usePosts = () => useContext(PostsContext)
