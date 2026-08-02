import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings as SettingsIcon, Edit3, LogOut, Grid3x3, Bookmark, Plus, Lock, Phone, Mail } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import ProfileGrid from '../components/profile/ProfileGrid'
import CreatePostModal from '../components/feed/CreatePostModal'
import EmptyState from '../components/common/EmptyState'
import { useAuth } from '../context/AuthContext'
import { usePosts } from '../context/PostsContext'
import { useLanguage } from '../context/LanguageContext'
import { getAgeGroup, AGE_GROUP_LABEL } from '../utils/ageGroup'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Profile() {
  const { user, logout } = useAuth()
  const { myPosts, savedPosts } = usePosts()
  const { t } = useLanguage()
  const ageGroup = user ? getAgeGroup(user.age) : null
  const [reputation, setReputation] = useState(null)
  const score = reputation?.trustScore ?? 0
  const [tab, setTab] = useState('posts')
  const [createOpen, setCreateOpen] = useState(false)
  const [profile, setProfile] = useState(user)

  useEffect(() => {
    const token = localStorage.getItem('mediashow_token')
    fetch(`${API_URL}/users/me/reputation`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setReputation)
      .catch(() => setReputation(null))
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('mediashow_token')
    const refresh = () => fetch(`${API_URL}/users/me`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setProfile).catch(() => {})
    refresh()
    window.addEventListener('follow:changed', refresh)
    window.addEventListener('focus', refresh)
    return () => { window.removeEventListener('follow:changed', refresh); window.removeEventListener('focus', refresh) }
  }, [user])

  const activePosts = tab === 'posts' ? myPosts : savedPosts

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-gray-100">{t('nav_profile')}</h1>
        <Link to="/settings" className="tap-scale flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-white/5 shadow-card">
          <SettingsIcon size={18} className="text-gray-500" />
        </Link>
      </div>

      <div className="soft-card p-6 text-center animate-scaleIn">
        <div className="flex justify-center">
          <Avatar name={user?.name || 'You'} src={user?.avatar} size={84} ring />
        </div>
        <h2 className="mt-3 font-display text-lg font-bold text-gray-800 dark:text-gray-100">
          {user?.name || 'Explorer'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">@{profile?.username}</p>
        {profile?.bio && <p className="mx-auto mt-3 max-w-md whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{profile.bio}</p>}
        {profile?.contact_email && <a href={`mailto:${profile.contact_email}`} className="mx-auto mt-2 flex w-fit items-center gap-1 text-sm text-primary hover:underline"><Mail size={13} />{profile.contact_email}</a>}
        {ageGroup && (
          <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {AGE_GROUP_LABEL[ageGroup]}
          </span>
        )}
        {user?.isPrivate && (
          <span className="ml-2 mt-2 inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-white/10 px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-300">
            <Lock size={11} /> Private account
          </span>
        )}
        <div className="mt-2.5 flex justify-center">
        </div>

        <div className="mt-4 flex items-center justify-center gap-6">
          <div>
            <p className="font-display text-lg font-bold text-gray-800 dark:text-gray-100">{profile?.post_count ?? myPosts.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile_posts')}</p>
          </div>
          <Link to="/profile/followers" className="hover-lift">
            <p className="font-display text-lg font-bold text-gray-800 dark:text-gray-100">{profile?.follower_count ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('followers')}</p>
          </Link>
          <Link to="/profile/following" className="hover-lift">
            <p className="font-display text-lg font-bold text-gray-800 dark:text-gray-100">{profile?.following_count ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('following')}</p>
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2.5">
          <Link to="/profile/edit">
            <Button variant="outline" size="sm">
              <Edit3 size={14} /> {t('edit_profile')}
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> {t('new_post')}
          </Button>
        </div>
      </div>

      <div className="mt-5 soft-card p-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('your_badges')}</p>
        {reputation && <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div><p className="text-xs uppercase tracking-wide text-gray-400">Reputation Score</p><p className="mt-1 text-3xl font-bold text-gray-800 dark:text-gray-100">{score}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-gray-400">Current Badge</p><p className="mt-1 text-xl font-bold text-accent-dark">{reputation.tier.label}</p></div>
        </div>}
        <div className="flex flex-wrap gap-2">
          {(reputation?.badges || []).map((badge) => {
            const b = badge.label
            return (
            <span key={badge.key} className="rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent-dark">
              🏅 {b}
            </span>
            )
          })}
          {!reputation && <span className="text-xs text-gray-400">Score unavailable</span>}
        </div>
        {reputation?.tier?.description && <p className="mt-3 text-sm text-gray-500 dark:text-gray-300">{reputation.tier.description}</p>}
      </div>

      {/* Instagram-style post grid with Posts / Saved tabs */}
      <div className="mt-6">
        <div className="flex border-b border-gray-100 dark:border-white/10">
          <button
            onClick={() => setTab('posts')}
            className={`tap-scale flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-sm font-semibold transition-colors duration-300 ${
              tab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-gray-400'
            }`}
          >
            <Grid3x3 size={16} /> {t('profile_posts')}
          </button>
          <button
            onClick={() => setTab('saved')}
            className={`tap-scale flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-sm font-semibold transition-colors duration-300 ${
              tab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-gray-400'
            }`}
          >
            <Bookmark size={16} /> {t('profile_saved')}
          </button>
        </div>

        {tab === 'saved' && (
          <Link to="/collections" className="mt-3 flex items-center justify-end text-xs font-semibold text-primary">
            Manage Collections →
          </Link>
        )}

        <div className="mt-3">
          {activePosts.length === 0 ? (
            <EmptyState
              icon={tab === 'posts' ? Grid3x3 : Bookmark}
              title={tab === 'posts' ? t('empty_posts_title') : t('empty_saved_title')}
              description={tab === 'posts' ? t('empty_posts_desc') : t('empty_saved_desc')}
            />
          ) : (
            <ProfileGrid posts={activePosts} />
          )}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Link to="/calls" className="soft-card flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover-lift">
          <span className="flex items-center gap-2"><Phone size={16} /> Call history</span>
        </Link>
        <Link to="/moderation-history" className="soft-card flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover-lift">
          Moderation History
        </Link>
        <Link to="/appeals" className="soft-card flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover-lift">
          My Appeals
        </Link>
        <Link to="/safe-center" className="soft-card flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover-lift">
          {t('safe_center')}
        </Link>
        <Link to="/parent-controls" className="soft-card flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover-lift">
          {t('parent_controls')}
        </Link>
        <Link to="/about" className="soft-card flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover-lift">
          {t('about_safezone')}
        </Link>
        <button
          onClick={logout}
          className="tap-scale w-full flex items-center gap-2 justify-center rounded-2xl border border-red-100 dark:border-red-900/40 p-4 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <LogOut size={16} /> {t('log_out')}
        </button>
      </div>

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
