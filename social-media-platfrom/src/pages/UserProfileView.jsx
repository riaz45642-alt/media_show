import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Grid3x3, Images, Lock, MessageCircle, ShieldCheck, User, UserCheck, UserPlus } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import EmptyState from '../components/common/EmptyState'
import ProfileGrid from '../components/profile/ProfileGrid'
import PostCard from '../components/cards/PostCard'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import CallButtons from '../components/calls/CallButtons'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function authHeaders(json = false) {
  const token = localStorage.getItem('mediashow_token')
  return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

function normalizePost(post) {
  const media = Array.isArray(post.media) ? post.media.map((item) => ({
    id: item.id, type: item.type, src: item.url, mimeType: item.mimeType,
  })) : []
  const comments = Array.isArray(post.comments) ? post.comments.map((comment) => ({
    id: comment.id, author: comment.author, authorId: comment.user_id,
    avatarSrc: comment.avatar_url, text: comment.text_content, createdAt: comment.created_at,
  })) : []
  return {
    id: post.id, author: post.author, authorId: post.author_id, avatarSrc: post.avatar_url,
    time: new Date(post.published_at || post.created_at).toLocaleString(),
    text: post.body || '', media, comments,
    type: media.length > 1 ? 'mixed' : (media[0]?.type || 'text'),
    likes: Number(post.like_count || 0), commentCount: Number(post.comment_count || comments.length),
    shares: Number(post.share_count || 0), likedByMe: Boolean(post.liked_by_me), saved: Boolean(post.saved_by_me), safe: true,
  }
}

export default function UserProfileView() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { findOrCreateConversation } = useChat()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [postsError, setPostsError] = useState('')
  const [tab, setTab] = useState('posts')

  const loadPosts = useCallback(async (cursor = '', replace = false) => {
    setLoadingPosts(true)
    setPostsError('')
    const requestUrl = `${API_URL}/users/${userId}/posts?limit=12${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    console.debug('[profile-posts] request', { requestUrl, userId })
    try {
      const response = await fetch(requestUrl, { headers: authHeaders() })
      console.debug('[profile-posts] response', { userId, status: response.status })
      if (response.status === 403) { setPosts([]); setHasMore(false); return }
      if (!response.ok) throw new Error('Unable to load posts.')
      const data = await response.json()
      if (!Array.isArray(data.posts)) throw new Error('Unable to load posts.')
      console.debug('[profile-posts] payload', { userId, postCount: data.posts.length, hasMore: Boolean(data.hasMore) })
      const normalized = data.posts.map(normalizePost)
      setPosts((previous) => replace ? normalized : [...previous, ...normalized])
      setNextCursor(data.nextCursor)
      setHasMore(Boolean(data.hasMore))
    } catch (requestError) {
      console.error('[profile-posts] failed', { userId, requestUrl, message: requestError.message })
      setPostsError('Unable to load posts.')
    } finally { setLoadingPosts(false) }
  }, [userId])

  const loadProfile = useCallback(async () => {
    const response = await fetch(`${API_URL}/users/${userId}`, { headers: authHeaders() })
    if (!response.ok) throw new Error('User not found')
    const data = await response.json()
    setProfile(data)
    return data
  }, [userId])

  useEffect(() => {
    if (user?.id === userId) { navigate('/profile', { replace: true }); return }
    let active = true
    setLoading(true)
    setError('')
    loadProfile()
      .then((data) => data.can_view_posts && active ? loadPosts('', true) : null)
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [user?.id, userId, navigate, loadProfile, loadPosts])

  const handleFollow = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/users/${userId}/follow`, { method: 'POST', headers: authHeaders(true) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Follow action failed')
      await loadProfile()
      if (data.status === 'accepted') await loadPosts('', true)
    } catch (requestError) { setError(requestError.message) }
    finally { setActionLoading(false) }
  }

  const handleMessage = async () => {
    const canMessage = profile?.can_message ?? !profile?.is_private
    if (!canMessage) return
    setActionLoading(true)
    try {
      const conversation = await findOrCreateConversation(userId)
      navigate(`/messages/${conversation.id}`)
    } catch (requestError) {
      console.error('[direct-chat] failed to start conversation', { userId, message: requestError.message })
      setError('Unable to start conversation.')
    }
    finally { setActionLoading(false) }
  }

  const visiblePosts = useMemo(() => tab === 'media' ? posts.filter((post) => post.media.length > 0) : posts, [posts, tab])
  const canMessage = profile?.can_message ?? !profile?.is_private

  if (loading) return <p className="py-10 text-center text-sm text-gray-400">Loading profile...</p>
  if (!profile) return <EmptyState icon={User} title="User not found" description={error || 'This profile is no longer available.'} />

  return (
    <div>
      <button onClick={() => navigate(-1)} aria-label="Back" className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-card dark:bg-white/5"><ChevronLeft size={18} /></button>
      <div className="soft-card p-6 text-center">
        <div className="flex justify-center"><Avatar name={profile.name} src={profile.avatar_url} size={84} ring /></div>
        <h1 className="mt-3 font-display text-lg font-bold">{profile.name}</h1>
        <p className="text-sm text-gray-400">@{profile.username}</p>
        {profile.bio && <p className="mx-auto mt-3 max-w-md whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{profile.bio}</p>}
        <p className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-400">{profile.is_private ? <><Lock size={12} /> Private account</> : <><ShieldCheck size={12} /> Public profile</>}</p>
        <div className="mt-5 flex justify-center gap-8">
          <div><p className="font-bold">{profile.post_count}</p><p className="text-xs text-gray-400">Posts</p></div>
          <Link to={`/users/${userId}/followers`}><p className="font-bold">{profile.follower_count}</p><p className="text-xs text-gray-400">Followers</p></Link>
          <Link to={`/users/${userId}/following`}><p className="font-bold">{profile.following_count}</p><p className="text-xs text-gray-400">Following</p></Link>
        </div>
        <div className="mt-5 flex justify-center gap-2.5">
          <Button variant={profile.is_following ? 'outline' : 'primary'} size="sm" disabled={actionLoading || profile.follow_pending} onClick={handleFollow}>
            {profile.is_following ? <UserCheck size={14} /> : <UserPlus size={14} />}
            {profile.is_following ? 'Following' : profile.follow_pending ? 'Requested' : 'Follow'}
          </Button>
          <Button variant="primary" size="sm" disabled={actionLoading || !canMessage} onClick={handleMessage}><MessageCircle size={14} /> Message</Button>
          {canMessage && <CallButtons userId={userId} userName={profile.name} />}
        </div>
        {!canMessage && <p className="mt-3 text-xs text-gray-400">{profile.messaging_enabled === false ? 'Messaging has been disabled by their parent.' : 'This account only accepts messages from approved followers.'}</p>}
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      </div>

      <section className="mt-6">
        <div className="flex border-b border-gray-100 dark:border-white/10">
          {[['posts', Grid3x3, 'Posts'], ['media', Images, 'Media']].map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-sm font-semibold ${tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}><Icon size={16} /> {label}</button>
          ))}
        </div>
        <div className="mt-3">
          {!profile.can_view_posts ? (
            <EmptyState icon={Lock} title="This account is private" description="Follow this account to see its posts." />
          ) : loadingPosts && posts.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Loading posts...</p>
          ) : postsError ? (
            <EmptyState icon={Grid3x3} title="Unable to load posts." description="Please check your connection and try again." />
          ) : visiblePosts.length === 0 ? (
            <EmptyState icon={tab === 'media' ? Images : Grid3x3} title={tab === 'media' ? 'No media yet.' : 'No posts yet.'} description="Nothing has been shared here yet." />
          ) : tab === 'media' ? <ProfileGrid posts={visiblePosts} /> : (
            <div className="space-y-5">{visiblePosts.map((post) => <PostCard key={post.id} post={post} />)}</div>
          )}
        </div>
        {hasMore && <div className="mt-4 text-center"><Button variant="outline" size="sm" disabled={loadingPosts} onClick={() => loadPosts(nextCursor)}>{loadingPosts ? 'Loading...' : 'Load more'}</Button></div>}
      </section>
    </div>
  )
}
