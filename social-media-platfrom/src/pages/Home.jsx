import { useEffect, useState } from 'react'
import { Sparkles, Smile, Meh, Frown, Zap, ImagePlus } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import PostCard from '../components/cards/PostCard'
import QuoteCard from '../components/cards/QuoteCard'
import ChallengeCard from '../components/cards/ChallengeCard'
import { SkeletonCard } from '../components/common/Skeleton'
import Avatar from '../components/ui/Avatar'
import CreatePostModal from '../components/feed/CreatePostModal'
import { QUOTES, CHALLENGES } from '../data/posts'
import { useAuth } from '../context/AuthContext'
import { usePosts } from '../context/PostsContext'
import { useLanguage } from '../context/LanguageContext'

export default function Home() {
  const { user } = useAuth()
  const { posts } = usePosts()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [mood, setMood] = useState('chill')
  const [createOpen, setCreateOpen] = useState(false)

  const MOODS = [
    { id: 'happy', icon: Smile, label: t('mood_happy'), color: 'text-secondary' },
    { id: 'chill', icon: Meh, label: t('mood_chill'), color: 'text-primary' },
    { id: 'low', icon: Frown, label: t('mood_low'), color: 'text-accent-dark' },
    { id: 'hyped', icon: Zap, label: t('mood_hyped'), color: 'text-accent' },
  ]

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <div>
      <PageHeader
        title={`${t('greeting')}, ${user?.name?.split(' ')[0] || 'Explorer'} 👋`}
        subtitle={t('home_subtitle')}
      />

      <QuoteCard quote={QUOTES[0]} />

      {/* Quick post composer */}
      <button
        onClick={() => setCreateOpen(true)}
        className="tap-scale soft-card mt-5 flex w-full items-center gap-3 p-4 text-left"
      >
        <Avatar name={user?.name || 'You'} src={user?.avatar} size={38} />
        <span className="flex-1 rounded-full bg-gray-50 dark:bg-white/5 px-4 py-2.5 text-sm text-gray-400">
          {t('whats_on_mind')}
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ImagePlus size={17} />
        </span>
      </button>

      {/* Mood based feed */}
      <div className="mt-5 soft-card p-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-1.5">
          <Sparkles size={15} className="text-accent-dark" /> {t('mood_prompt')}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {MOODS.map(({ id, icon: Icon, label, color }) => (
            <button
              key={id}
              onClick={() => setMood(id)}
              className={`tap-scale flex flex-col items-center gap-1 rounded-2xl border p-3 transition-colors duration-300 ${
                mood === id ? 'border-primary/40 bg-primary/10' : 'border-gray-100 dark:border-white/10'
              }`}
            >
              <Icon size={18} className={color} />
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Daily kindness challenge */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">{t('daily_challenge')}</p>
        <div className="space-y-2">
          {CHALLENGES.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="mt-6 space-y-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('your_feed')}</p>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
