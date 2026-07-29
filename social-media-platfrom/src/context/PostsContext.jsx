import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
  const [posts, setPosts] = useState([])
  const [mutedAuthors, setMutedAuthors] = useState([])
  const [blockedAuthors, setBlockedAuthors] = useState([])
  // Saved Collections: { id, name, postIds: [] }[] — session-only, like posts above.
  const [collections, setCollections] = useState([
    { id: 'col-default', name: 'All Saved', postIds: [] },
  ])

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const normalizePost = useCallback((post) => ({
    id: post.id,
    author: post.author || user?.name || 'Member',
    authorId: post.author_id || post.user_id,
    time: new Date(post.created_at).toLocaleString(),
    type: 'text',
    text: post.body ?? post.text_content ?? '',
    media: [],
    likes: Number(post.like_count ?? post.likes_count ?? 0),
    comments: [],
    safe: post.moderation_status === 'safe',
    own: (post.author_id || post.user_id) === user?.id,
  }), [user?.id, user?.name])

  useEffect(() => {
    let active = true
    fetch(`${API_URL}/posts`)
      .then((response) => response.ok ? response.json() : [])
      .then((rows) => active && setPosts(rows.map(normalizePost)))
      .catch(() => active && setPosts([]))
    return () => { active = false }
  }, [API_URL, normalizePost])

  const tokenHeaders = () => {
    const token = localStorage.getItem('mediashow_token')
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const toggleLike = async (id) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? p.likes - 1 : p.likes + 1 }
          : p
      )
    )
    try {
      const response = await fetch(`${API_URL}/posts/${id}/reaction`, { method: 'POST', headers: tokenHeaders() })
      const result = await response.json()
      if (response.ok) setPosts((previous) => previous.map((post) => post.id === id ? { ...post, likedByMe: result.liked, likes: Number(result.likeCount) } : post))
    } catch { /* optimistic state is corrected on the next feed refresh */ }
  }

  const toggleSave = (id) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)))
  }

  const addComment = async (id, text) => {
    if (!text?.trim()) return
    const response = await fetch(`${API_URL}/posts/${id}/comments`, {
      method: 'POST', headers: tokenHeaders(), body: JSON.stringify({ text: text.trim() }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || 'Comment could not be added')
    const comment = { id: data.comment.id, author: user?.name || 'You', text: data.comment.text_content }
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, comments: [...p.comments, comment] } : p))
    )
  }

  const incrementShare = (id) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, shares: (p.shares || 0) + 1 } : p)))
  }

  const addPost = async ({ text }) => {
    const token = localStorage.getItem('mediashow_token')
    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || 'Post could not be published')
    const post = normalizePost({ ...data.post, author: user?.name })
    setPosts((previous) => [post, ...previous])
    return post
  }

  const deletePost = async (id) => {
    const response = await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE', headers: tokenHeaders() })
    if (!response.ok && response.status !== 204) throw new Error('Post could not be deleted')
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  const editPost = async (id, text) => {
    const response = await fetch(`${API_URL}/posts/${id}`, {
      method: 'PATCH', headers: tokenHeaders(), body: JSON.stringify({ text }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || 'Post could not be updated')
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, text, edited: true } : p)))
  }

  const toggleMuteAuthor = (author) => {
    setMutedAuthors((prev) => (prev.includes(author) ? prev.filter((a) => a !== author) : [...prev, author]))
  }

  const toggleBlockAuthor = (author) => {
    setBlockedAuthors((prev) => (prev.includes(author) ? prev.filter((a) => a !== author) : [...prev, author]))
  }

  const myPosts = useMemo(() => posts.filter((p) => p.own), [posts])
  const savedPosts = useMemo(() => posts.filter((p) => p.saved), [posts])
  const visiblePosts = useMemo(
    () => posts.filter((p) => !blockedAuthors.includes(p.author) && !mutedAuthors.includes(p.author)),
    [posts, blockedAuthors, mutedAuthors]
  )

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
    visiblePosts,
    myPosts,
    savedPosts,
    collections,
    addPost,
    toggleLike,
    toggleSave,
    addComment,
    incrementShare,
    deletePost,
    editPost,
    mutedAuthors,
    blockedAuthors,
    toggleMuteAuthor,
    toggleBlockAuthor,
    createCollection,
    renameCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
  }

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
}

export const usePosts = () => useContext(PostsContext)
