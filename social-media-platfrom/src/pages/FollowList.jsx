import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Lock, Users } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/common/EmptyState'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function FollowList({ type }) {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, users: [], name: '', private: false })
  const title = type === 'followers' ? 'Followers' : 'Following'

  useEffect(() => {
    let active = true
    const token = localStorage.getItem('mediashow_token')
    fetch(`${API_URL}/users/${userId || 'me'}/connections?type=${type}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (response) => {
        if (response.status === 403) return { private: true, users: [] }
        if (!response.ok) throw new Error('List could not be loaded')
        return response.json()
      })
      .then((data) => active && setState({ loading: false, users: data.users || [], name: data.name || '', private: Boolean(data.private) }))
      .catch(() => active && setState({ loading: false, users: [], name: '', private: false }))
    return () => { active = false }
  }, [userId, type])

  return <div>
    <div className="mb-5 flex items-center gap-3">
      <button onClick={() => navigate(-1)} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-card dark:bg-white/5"><ChevronLeft size={18} /></button>
      <div><h1 className="font-display text-xl font-bold">{title}</h1><p className="text-xs text-gray-400">{state.name}{!state.private && !state.loading ? ` · ${state.users.length}` : ''}</p></div>
    </div>
    {state.loading ? <p className="py-8 text-center text-sm text-gray-400">Loading...</p>
      : state.private ? <EmptyState icon={Lock} title="This account is private" description={`Only approved followers can see this ${title.toLowerCase()} list.`} />
      : state.users.length === 0 ? <EmptyState icon={Users} title={`No ${title.toLowerCase()} yet`} description="This list is empty right now." />
      : <div className="space-y-2">{state.users.map((person) => <Link key={person.id} to={`/users/${person.id}`} className="soft-card flex items-center gap-3.5 p-4 hover-lift"><Avatar name={person.name} src={person.avatar_url} size={46} /><div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 text-sm font-semibold">{person.name}{person.is_private && <Lock size={12} className="text-gray-400" />}</p><p className="text-xs text-gray-400">@{person.username}</p></div></Link>)}</div>}
  </div>
}
