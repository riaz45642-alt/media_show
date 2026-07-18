import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings as SettingsIcon, Edit3, Award, Gauge, LogOut, Grid3x3, Bookmark, Plus } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import ProfileGrid from '../components/profile/ProfileGrid'
import CreatePostModal from '../components/feed/CreatePostModal'
import EmptyState from '../components/common/EmptyState'
import { useAuth } from '../context/AuthContext'
import { usePosts } from '../context/PostsContext'
import { useLanguage } from '../context/LanguageContext'
import { getAgeGroup, AGE_GROUP_LABEL } from '../utils/ageGroup'

export default function Profile() {
  const { user, logout } = useAuth()
  const { myPosts, savedPosts } = usePosts()
  const { t } = useLanguage()
  const ageGroup = user ? getAgeGroup(user.age) : null
  const score = user?.safeZoneScore ?? 82
  const [tab, setTab] = useState('posts')
  const [createOpen, setCreateOpen] = useState(false)

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
        <h2 className="mt-3 font-display text-lg font-bold text-gray-800 dark:text-gray-100">{user?.name || 'Explorer'}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
        {ageGroup && (
          <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {AGE_GROUP_LABEL[ageGroup]}
          </span>
        )}

        <div className="mt-4 flex items-center justify-center gap-6">
          <div>
            <p className="font-display text-lg font-bold text-gray-800 dark:text-gray-100">{myPosts.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile_posts')}</p>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-gray-800 dark:text-gray-100">248</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('followers')}</p>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-gray-800 dark:text-gray-100">180</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('following')}</p>
          </div>
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

      <div className="mt-4 grid grid-cols-2 gap-3.5">
        <div className="soft-card p-4 text-center">
          <Gauge size={20} className="mx-auto text-secondary" />
          <p className="mt-2 text-xl font-bold text-gray-800 dark:text-gray-100">{score}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('safe_zone_score')}</p>
        </div>
        <div className="soft-card p-4 text-center">
          <Award size={20} className="mx-auto text-accent-dark" />
          <p className="mt-2 text-xl font-bold text-gray-800 dark:text-gray-100">{user?.badges?.length ?? 3}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('badges_earned')}</p>
        </div>
      </div>

      <div className="mt-5 soft-card p-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('your_badges')}</p>
        <div className="flex flex-wrap gap-2">
          {(user?.badges?.length ? user.badges : ['Newcomer', 'Kind Heart', 'Curious Mind']).map((b) => (
            <span key={b} className="rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent-dark">
              🏅 {b}
            </span>
          ))}
        </div>
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
