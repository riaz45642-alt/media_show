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
  const normalizePost = useCallback((post) => {
    const media = Array.isArray(post.media) ? post.media.map((item) => ({
      id: item.id,
      type: item.type,
      src: item.url || item.src,
      mimeType: item.mimeType || item.mime_type,
    })) : []
    const comments = Array.isArray(post.comments) ? post.comments.map((comment) => ({
      id: comment.id,
      author: comment.author || 'Member',
      authorId: comment.user_id,
      avatarSrc: comment.avatar_url,
      text: comment.text_content ?? comment.body ?? '',
      createdAt: comment.created_at,
    })) : []
    return {
      id: post.id,
      author: post.author || user?.name || 'Member',
      authorId: post.author_id || post.user_id,
      avatarSrc: post.avatar_url,
      time: new Date(post.published_at || post.created_at).toLocaleString(),
      type: media.length ? (media.length > 1 ? 'mixed' : media[0].type) : 'text',
      text: post.body ?? post.text_content ?? '',
      media,
      likes: Number(post.like_count ?? post.likes_count ?? 0),
      comments,
      commentCount: Math.max(Number(post.comment_count ?? 0), comments.length),
      shares: Number(post.share_count ?? 0),
      safe: post.moderation_status === 'safe',
      own: (post.author_id || post.user_id) === user?.id,
    }
  }, [user?.id, user?.name])

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
    const comment = {
      id: data.comment.id,
      author: user?.name || data.comment.author || 'You',
      avatarSrc: user?.avatar,
      text: data.comment.text_content,
      createdAt: data.comment.created_at,
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? {
        ...p,
        comments: [...p.comments, comment],
        commentCount: Number(data.commentCount ?? p.commentCount + 1),
      } : p))
    )
    return comment
  }

  const incrementShare = (id) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, shares: (p.shares || 0) + 1 } : p)))
  }

  const addPost = async ({ text, media = [] }) => {
    const token = localStorage.getItem('mediashow_token')
    const body = new FormData()
    body.append('text', text || '')
    media.forEach((item) => body.append('media', item.file))
    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
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
