import { useRef } from 'react'
import { Plus } from 'lucide-react'
import Avatar from '../ui/Avatar'
import StoryViewerModal from './StoryViewerModal'
import { useAuth } from '../../context/AuthContext'
import { useStories } from '../../context/StoriesContext'

export default function StoriesBar() {
  const { user } = useAuth()
  const { storiesByUser, authors, myStories, addStory, hasUnseen, activeEntryId, setActiveEntryId, error } = useStories()
  const fileRef = useRef(null)

  const entries = [
    ...(myStories.length ? [{ id: 'me', name: user?.name || 'You', avatar: user?.avatar, color: '#4A90E2' }] : []),
    ...Object.keys(storiesByUser).filter((id) => id !== user?.id).map((id) => authors[id]),
  ]

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try { await addStory({ file }); setActiveEntryId('me') } catch (uploadError) { window.alert(uploadError.message) }
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

        {entries.filter((entry) => entry.id !== 'me').map((u) => {
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
      {error && <p className="px-4 text-xs text-red-500">{error}</p>}

      <StoryViewerModal entries={entries} activeId={activeEntryId} onClose={() => setActiveEntryId(null)} />
    </>
  )
}
