import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Lock, MessageCircle, UserCheck, UserPlus, Users } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import EmptyState from '../components/common/EmptyState'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const authHeaders = () => {
  const token = localStorage.getItem('mediashow_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function FollowList({ type }) {
  const { userId } = useParams()
  const { user } = useAuth()
  const { findOrCreateConversation } = useChat()
  const navigate = useNavigate()
  const targetId = userId || 'me'
  const [state, setState] = useState({ loading: true, users: [], name: '', private: false, error: '', hasMore: false, nextOffset: null })
  const [busyId, setBusyId] = useState(null)
  const title = type === 'followers' ? 'Followers' : 'Following'

  const load = useCallback(async ({ offset = 0, append = false } = {}) => {
    if (!append) setState((previous) => ({ ...previous, loading: true, error: '' }))
    try {
      const response = await fetch(`${API_URL}/users/${targetId}/connections?type=${type}&limit=20&offset=${offset}`, { headers: authHeaders() })
      const data = await response.json().catch(() => ({}))
      if (response.status === 403) return setState({ loading: false, users: [], name: '', private: true, error: '', hasMore: false, nextOffset: null })
      if (!response.ok) throw new Error(data.message || 'Unable to load this list.')
      setState((previous) => ({ loading: false, users: append ? [...previous.users, ...(data.users || [])] : (data.users || []), name: data.name || '', private: false, error: '', hasMore: Boolean(data.hasMore), nextOffset: data.nextOffset }))
    } catch (error) {
      setState((previous) => ({ ...previous, loading: false, error: error.message }))
    }
  }, [targetId, type])

  useEffect(() => { load() }, [load])

  const toggleFollow = async (person) => {
    setBusyId(person.id)
    try {
      const response = await fetch(`${API_URL}/users/${person.id}/follow`, { method: 'POST', headers: authHeaders() })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Follow action failed.')
      setState((previous) => ({ ...previous, users: previous.users.map((entry) => entry.id === person.id ? { ...entry, is_following: Boolean(data.following), follow_pending: data.status === 'pending' } : entry) }))
      window.dispatchEvent(new CustomEvent('follow:changed'))
      if (targetId === 'me' && type === 'following' && !data.following) setState((previous) => ({ ...previous, users: previous.users.filter((entry) => entry.id !== person.id) }))
    } catch (error) { setState((previous) => ({ ...previous, error: error.message })) }
    finally { setBusyId(null) }
  }

  const openMessage = async (person) => {
    if (!person.can_message) return
    setBusyId(person.id)
    try {
      const conversation = await findOrCreateConversation(person.id)
      navigate(`/messages/${conversation.id}`)
    } catch (error) { setState((previous) => ({ ...previous, error: error.message || 'Unable to start conversation.' })) }
    finally { setBusyId(null) }
  }

  return <div>
    <div className="mb-5 flex items-center gap-3">
      <button onClick={() => navigate(-1)} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-card dark:bg-white/5"><ChevronLeft size={18} /></button>
      <div><h1 className="font-display text-xl font-bold">{title}</h1><p className="text-xs text-gray-400">{state.name}{!state.private && !state.loading ? ` · ${state.users.length}${state.hasMore ? '+' : ''}` : ''}</p></div>
    </div>
    {state.error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{state.error} <button onClick={() => load()} className="ml-2 font-semibold underline">Retry</button></div>}
    {state.loading ? <p className="py-8 text-center text-sm text-gray-400">Loading...</p>
      : state.private ? <EmptyState icon={Lock} title="This account is private" description={`Only approved followers can see this ${title.toLowerCase()} list.`} />
      : state.users.length === 0 ? <EmptyState icon={Users} title={`No ${title.toLowerCase()} yet`} description="This list is empty right now." />
      : <div className="space-y-2">{state.users.map((person) => <div key={person.id} className="soft-card flex flex-wrap items-center gap-3 p-4">
          <Link to={`/users/${person.id}`} className="flex min-w-0 flex-1 items-center gap-3"><Avatar name={person.name} src={person.avatar_url} size={46} /><div className="min-w-0"><p className="flex items-center gap-1.5 truncate text-sm font-semibold">{person.name}{person.is_private && <Lock size={12} className="text-gray-400" />}</p><p className="truncate text-xs text-gray-400">@{person.username}</p></div></Link>
          {person.id !== user?.id && <div className="flex items-center gap-2">
            <Button size="sm" variant={person.is_following ? 'outline' : 'primary'} disabled={busyId === person.id || person.follow_pending} onClick={() => toggleFollow(person)}>{person.is_following ? <UserCheck size={14} /> : <UserPlus size={14} />}{person.is_following ? 'Following' : person.follow_pending ? 'Requested' : 'Follow'}</Button>
            {person.can_message && <Button size="sm" variant="outline" disabled={busyId === person.id} onClick={() => openMessage(person)}><MessageCircle size={14} /><span className="hidden sm:inline">Message</span></Button>}
          </div>}
        </div>)}</div>}
    {state.hasMore && <div className="mt-4 text-center"><Button variant="outline" size="sm" onClick={() => load({ offset: state.nextOffset, append: true })}>Load more</Button></div>}
  </div>
}
