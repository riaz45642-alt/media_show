import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, User as UserIcon, Users } from 'lucide-react'
import Avatar from '../ui/Avatar'
import Portal from '../ui/Portal'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import * as groupService from '../../services/groupService'

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const debounced = useDebouncedValue(query, 250)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    Promise.all([
      groupService.searchUsers(debounced),
      groupService.listGroups(debounced.trim() ? { search: debounced.trim() } : {}),
    ])
      .then(([users, groupResults]) => {
        if (!active) return
        setPeople(users)
        setGroups(groupResults)
      })
      .catch(() => {
        if (active) { setPeople([]); setGroups([]) }
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [open, debounced])

  if (!open) return null
  const goTo = (path) => {
    setQuery('')
    onClose()
    navigate(path)
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="mx-auto flex max-h-[90vh] max-w-3xl flex-col overflow-hidden bg-white shadow-card dark:bg-gray-900 sm:mt-4 sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-2.5 border-b border-gray-100 p-4 dark:border-white/10">
            <Search size={18} className="shrink-0 text-gray-400" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="Search registered users and groups"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" />
            <button onClick={onClose} aria-label="Close search"><X size={20} /></button>
          </div>
          <div className="overflow-y-auto p-4">
            {loading && <p className="py-8 text-center text-sm text-gray-400">Searching...</p>}
            {!loading && people.length === 0 && groups.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-sm text-gray-400">
                <Search size={22} /> No matching users or groups.
              </div>
            )}
            {!loading && people.length > 0 && (
              <section className="mb-5">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400"><UserIcon size={13} /> People</h3>
                {people.map((person) => (
                  <button key={person.id} onClick={() => goTo(`/users/${person.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-gray-50 dark:hover:bg-white/5">
                    <Avatar name={person.name} size={38} />
                    <div><p className="text-sm font-medium">{person.name}</p>{person.username && <p className="text-xs text-gray-400">@{person.username}</p>}</div>
                  </button>
                ))}
              </section>
            )}
            {!loading && groups.length > 0 && (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400"><Users size={13} /> Groups</h3>
                {groups.map((group) => (
                  <button key={group.id} onClick={() => goTo(`/groups/${group.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-gray-50 dark:hover:bg-white/5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">{group.name.slice(0, 1).toUpperCase()}</span>
                    <div><p className="text-sm font-medium">{group.name}</p><p className="text-xs text-gray-400">{group.member_count} members</p></div>
                  </button>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}
