import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, User as UserIcon, PlayCircle, TrendingUp } from 'lucide-react'
import Avatar from '../ui/Avatar'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { USERS } from '../../data/users'
import { VIDEOS } from '../../data/videos'

// Bold the matched substring so results feel like real live-search, not just a filtered list.
function Highlight({ text, query }) {
  if (!query) return text
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i === -1) return text
  return (
    <>
      {text.slice(0, i)}
      <span className="text-primary font-bold">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  )
}

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 150)
  const navigate = useNavigate()

  const q = debounced.trim().toLowerCase()

  const matchedUsers = useMemo(
    () => (q ? USERS.filter((u) => u.name.toLowerCase().includes(q)) : USERS.slice(0, 4)),
    [q]
  )

  const matchedVideos = useMemo(
    () =>
      q
        ? VIDEOS.filter(
            (v) =>
              v.title.toLowerCase().includes(q) ||
              v.creator.toLowerCase().includes(q) ||
              v.tag.toLowerCase().includes(q)
          )
        : VIDEOS.slice(0, 3),
    [q]
  )

  if (!open) return null

  const goTo = (path) => {
    onClose()
    setQuery('')
    navigate(path)
  }

  const hasQuery = q.length > 0
  const noResults = hasQuery && matchedUsers.length === 0 && matchedVideos.length === 0

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div
        className="mx-auto mt-0 max-w-3xl bg-white dark:bg-gray-900 sm:mt-4 sm:rounded-3xl shadow-card animate-slideUp max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-white/10 p-4">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search profiles, videos, hashtags…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-gray-100"
          />
          <button onClick={onClose} className="tap-scale shrink-0 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {!hasQuery && (
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
              <TrendingUp size={13} /> Suggested for you
            </p>
          )}

          {noResults ? (
            <div className="py-10 text-center text-sm text-gray-400">
              No results for "{debounced}". Try a different letter or name.
            </div>
          ) : (
            <>
              {matchedUsers.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Profiles</p>
                  <div className="space-y-1">
                    {matchedUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => goTo(`/users/${u.id}`)}
                        className="tap-scale flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        <Avatar name={u.name} src={u.avatar} color={u.color} size={38} />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          <Highlight text={u.name} query={debounced} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchedVideos.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Videos</p>
                  <div className="space-y-1">
                    {matchedVideos.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => goTo('/videos')}
                        className="tap-scale flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                          style={{ backgroundColor: v.color }}
                        >
                          <PlayCircle size={19} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                            <Highlight text={v.title} query={debounced} />
                          </span>
                          <span className="block truncate text-xs text-gray-400">
                            <Highlight text={v.creator} query={debounced} /> · {v.duration}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!hasQuery && matchedUsers.length === 0 && matchedVideos.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-gray-400">
              <UserIcon size={22} />
              Start typing to search
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
