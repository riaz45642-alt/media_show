import { useState } from 'react'
import { Plus } from 'lucide-react'
import Avatar from '../ui/Avatar'
import StoryViewerModal from './StoryViewerModal'
import { USERS } from '../../data/users'
import { useAuth } from '../../context/AuthContext'

const STORY_USERS = USERS.filter((u) => u.hasStory)

export default function StoriesBar() {
  const { user } = useAuth()
  const [activeIndex, setActiveIndex] = useState(null)
  const [seen, setSeen] = useState(() => new Set())

  const openStory = (i) => {
    setActiveIndex(i)
    setSeen((prev) => new Set(prev).add(STORY_USERS[i].id))
  }

  return (
    <>
      <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 pt-1 scroll-smooth sm:-mx-6 sm:px-6">
        {/* "Your story" — always first */}
        <button className="tap-scale flex shrink-0 flex-col items-center gap-1.5">
          <span className="relative">
            <Avatar name={user?.name || 'You'} src={user?.avatar} size={62} />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-white dark:ring-gray-900">
              <Plus size={12} strokeWidth={3} />
            </span>
          </span>
          <span className="max-w-[62px] truncate text-[11px] text-gray-600 dark:text-gray-300">Your story</span>
        </button>

        {STORY_USERS.map((u, i) => (
          <button key={u.id} onClick={() => openStory(i)} className="tap-scale flex shrink-0 flex-col items-center gap-1.5">
            <span
              className={`flex h-[66px] w-[66px] items-center justify-center rounded-full ${
                seen.has(u.id) ? 'bg-gray-200 dark:bg-white/10' : 'gradient-brand'
              }`}
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-white p-0.5 dark:bg-gray-900">
                <Avatar name={u.name} src={u.avatar} color={u.color} size={58} />
              </span>
            </span>
            <span className="max-w-[62px] truncate text-[11px] text-gray-600 dark:text-gray-300">
              {u.name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      <StoryViewerModal
        users={STORY_USERS}
        activeIndex={activeIndex}
        onClose={() => setActiveIndex(null)}
        onNext={() => setActiveIndex((i) => (i < STORY_USERS.length - 1 ? i + 1 : null))}
        onPrev={() => setActiveIndex((i) => (i > 0 ? i - 1 : i))}
      />
    </>
  )
}
