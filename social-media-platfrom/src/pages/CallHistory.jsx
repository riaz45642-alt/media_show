import { useCallback, useEffect, useState } from 'react'
import { Phone, PhoneIncoming, PhoneMissed, Video } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import CallButtons from '../components/calls/CallButtons'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const formatDuration = (seconds = 0) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const displayStatus = (call) => call.status === 'ended' ? 'Completed' : call.status === 'missed' ? 'Missed' : call.status === 'declined' ? 'Declined' : call.status === 'accepted' ? 'Connected' : call.status[0].toUpperCase() + call.status.slice(1)

export default function CallHistory() {
  const [state, setState] = useState({ calls: [], loading: true, error: '', hasMore: false, nextOffset: null })
  const load = useCallback(async (offset = 0, append = false) => {
    try {
      const token = localStorage.getItem('mediashow_token')
      const response = await fetch(`${API_URL}/calls/history?limit=20&offset=${offset}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Unable to load call history.')
      setState((previous) => ({ calls: append ? [...previous.calls, ...data.calls] : data.calls, loading: false, error: '', hasMore: data.hasMore, nextOffset: data.nextOffset }))
    } catch (error) { setState((previous) => ({ ...previous, loading: false, error: error.message })) }
  }, [])
  useEffect(() => { load() }, [load])

  return <div>
    <PageHeader title="Call history" subtitle="Your audio and video calls." />
    {state.error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{state.error} <button onClick={() => load()} className="font-semibold underline">Retry</button></div>}
    {state.loading ? <p className="py-10 text-center text-sm text-gray-400">Loading calls...</p> : state.calls.length === 0 ? <EmptyState icon={PhoneIncoming} title="No calls yet" description="Your completed, declined, and missed calls will appear here." /> : <div className="space-y-2">
      {state.calls.map((call) => {
        const StatusIcon = call.status === 'missed' ? PhoneMissed : call.kind === 'video' ? Video : Phone
        return <div key={call.id} className="soft-card flex flex-wrap items-center gap-3 p-4">
          <Avatar name={call.other_name} src={call.other_avatar_url} size={46} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{call.other_name}</p><p className="truncate text-xs text-gray-400">@{call.other_username}</p><p className={`mt-1 flex items-center gap-1 text-xs ${call.status === 'missed' ? 'text-red-500' : 'text-gray-500'}`}><StatusIcon size={13} /> {call.outgoing ? 'Outgoing' : 'Incoming'} {call.kind === 'video' ? 'video' : 'audio'} · {displayStatus(call)}{call.status === 'ended' ? ` · ${formatDuration(call.duration_seconds)}` : ''}</p><p className="text-[11px] text-gray-400">{new Date(call.created_at).toLocaleString()}</p></div>
          <CallButtons userId={call.other_user_id} userName={call.other_name} />
        </div>
      })}
    </div>}
    {state.hasMore && <div className="mt-4 text-center"><Button variant="outline" size="sm" onClick={() => load(state.nextOffset, true)}>Load more</Button></div>}
  </div>
}
