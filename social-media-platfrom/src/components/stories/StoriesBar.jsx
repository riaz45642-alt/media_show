import { useRef } from 'react'
import { Plus } from 'lucide-react'
import Avatar from '../ui/Avatar'
import StoryViewerModal from './StoryViewerModal'
import { USERS } from '../../data/users'
import { useAuth } from '../../context/AuthContext'
import { useStories } from '../../context/StoriesContext'

const STORY_USERS = USERS.filter((u) => u.hasStory)

export default function StoriesBar() {
  const { user } = useAuth()
  const { myStories, addStory, hasUnseen, activeEntryId, setActiveEntryId } = useStories()
  const fileRef = useRef(null)

  const entries = [
    ...(myStories.length ? [{ id: 'me', name: user?.name || 'You', avatar: user?.avatar, color: '#4A90E2' }] : []),
    ...STORY_USERS,
  ]

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const type = file.type.startsWith('video') ? 'video' : 'image'
    const src = URL.createObjectURL(file)
    addStory({ type, src })
    setActiveEntryId('me')
  }

  return (
    <>
      <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 pt-1 scroll-smooth sm:-mx-6 sm:px-6">
        <button
          onClick={() => (myStories.length ? setActiveEntryId('me') : fileRef.current?.click())}
          className="tap-scale flex shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative">
            <span
              className={`flex h-[66px] w-[66px] items-center justify-center rounded-full p-[2.5px] ${
                myStories.length ? 'bg-secondary' : ''
              }`}
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-white p-0.5 dark:bg-gray-900">
                <Avatar name={user?.name || 'You'} src={user?.avatar} size={myStories.length ? 58 : 62} />
              </span>
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-white dark:ring-gray-900"
            >
              <Plus size={12} strokeWidth={3} />
            </span>
          </span>
          <span className="max-w-[62px] truncate text-[11px] text-gray-600 dark:text-gray-300">Your story</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />

        {STORY_USERS.map((u) => {
          const unseen = hasUnseen(u.id)
          return (
            <button
              key={u.id}
              onClick={() => setActiveEntryId(u.id)}
              className="tap-scale flex shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`flex h-[66px] w-[66px] items-center justify-center rounded-full p-[2.5px] ${
                  unseen ? 'bg-secondary' : 'bg-gray-200 dark:bg-white/10'
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
          )
        })}
      </div>

      <StoryViewerModal entries={entries} activeId={activeEntryId} onClose={() => setActiveEntryId(null)} />
    </>
  )
}
