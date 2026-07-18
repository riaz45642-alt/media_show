import { useEffect, useState } from 'react'
import { Sparkles, Smile, Meh, Frown, Zap } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import PostCard from '../components/cards/PostCard'
import QuoteCard from '../components/cards/QuoteCard'
import ChallengeCard from '../components/cards/ChallengeCard'
import { SkeletonCard } from '../components/common/Skeleton'
import { POSTS, QUOTES, CHALLENGES } from '../data/posts'
import { useAuth } from '../context/AuthContext'

const MOODS = [
  { id: 'happy', icon: Smile, label: 'Happy', color: 'text-secondary' },
  { id: 'chill', icon: Meh, label: 'Chill', color: 'text-primary' },
  { id: 'low', icon: Frown, label: 'Low', color: 'text-accent-dark' },
  { id: 'hyped', icon: Zap, label: 'Hyped', color: 'text-accent' },
]

export default function Home() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [mood, setMood] = useState('chill')

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <div>
      <PageHeader
        title={`Hi, ${user?.name?.split(' ')[0] || 'Explorer'} 👋`}
        subtitle="Here's your calm, curated feed for today."
      />

      <QuoteCard quote={QUOTES[0]} />

      {/* Mood based feed */}
      <div className="mt-5 soft-card p-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-1.5">
          <Sparkles size={15} className="text-accent-dark" /> How are you feeling today?
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
        <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Daily Kindness Challenge</p>
        <div className="space-y-2">
          {CHALLENGES.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="mt-6 space-y-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Your Feed</p>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : POSTS.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  )
}
