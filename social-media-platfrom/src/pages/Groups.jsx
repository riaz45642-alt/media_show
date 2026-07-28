import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Lock, Globe } from 'lucide-react'
import * as groupService from '../services/groupService'
import CreateGroupModal from '../components/groups/CreateGroupModal'

function GroupCard({ group }) {
  return (
    <Link to={`/groups/${group.id}`} className="soft-card flex items-center gap-3 rounded-xl p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-lg font-bold text-primary">
        {group.avatar_url ? <img src={group.avatar_url} alt="" className="h-full w-full object-cover" /> : group.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-semibold">{group.name}</p>
          {group.privacy === 'private' ? <Lock size={12} className="text-gray-400" /> : <Globe size={12} className="text-gray-400" />}
        </div>
        <p className="truncate text-sm text-gray-500 dark:text-gray-400">{group.category} &middot; {group.member_count} members</p>
      </div>
      {group.my_role && (
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{group.my_role}</span>
      )}
    </Link>
  )
}

export default function Groups() {
  const [tab, setTab] = useState('discover') // discover | mine
  const [groups, setGroups] = useState([])
  const [suggested, setSuggested] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [list, sug] = await Promise.all([
        groupService.listGroups({ mine: tab === 'mine' ? 'true' : 'false', ...(search ? { search } : {}) }),
        tab === 'discover' ? groupService.suggestedGroups() : Promise.resolve([]),
      ])
      setGroups(list)
      setSuggested(sug)
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Groups &amp; Communities</h1>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white">
          <Plus size={16} /> Create
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search groups"
            className="w-full rounded-full border border-gray-200 bg-white/70 py-2 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-white/5"
          />
        </div>
        <div className="flex overflow-hidden rounded-full border border-gray-200 dark:border-white/10">
          <button onClick={() => setTab('discover')} className={`px-3 py-2 text-sm font-medium ${tab === 'discover' ? 'bg-primary text-white' : ''}`}>Discover</button>
          <button onClick={() => setTab('mine')} className={`px-3 py-2 text-sm font-medium ${tab === 'mine' ? 'bg-primary text-white' : ''}`}>My groups</button>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-gray-400">Loading groups...</p>
      ) : (
        <>
          {tab === 'discover' && suggested.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-500">Suggested for you</h2>
              <div className="space-y-2">{suggested.map((g) => <GroupCard key={g.id} group={g} />)}</div>
            </div>
          )}
          <div>
            {tab === 'discover' && <h2 className="mb-2 text-sm font-semibold text-gray-500">All groups</h2>}
            <div className="space-y-2">
              {groups.map((g) => <GroupCard key={g.id} group={g} />)}
              {groups.length === 0 && <p className="py-8 text-center text-gray-400">No groups found.</p>}
            </div>
          </div>
        </>
      )}

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </div>
  )
}
