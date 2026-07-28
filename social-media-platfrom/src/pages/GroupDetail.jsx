import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Lock, Globe, LogOut, Trash2 } from 'lucide-react'
import * as groupService from '../services/groupService'
import GroupChat from '../components/groups/GroupChat'
import GroupMembers from '../components/groups/GroupMembers'
import GroupEducation from '../components/groups/GroupEducation'

export default function GroupDetail() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [tab, setTab] = useState('chat')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  const load = () => groupService.getGroup(groupId).then(setGroup).finally(() => setLoading(false))
  useEffect(() => { load() }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = async () => {
    setJoining(true)
    try {
      const res = await groupService.joinGroup(groupId)
      if (res.status === 'joined') load()
      else alert('Your request to join has been sent to the group admins.')
    } catch (err) {
      alert(err.message)
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return
    await groupService.leaveGroup(groupId).catch((e) => alert(e.message))
    navigate('/groups')
  }

  const handleDelete = async () => {
    if (!confirm('Delete this group permanently?')) return
    await groupService.deleteGroup(groupId).catch((e) => alert(e.message))
    navigate('/groups')
  }

  if (loading) return <p className="py-8 text-center text-gray-400">Loading group...</p>
  if (!group) return <p className="py-8 text-center text-gray-400">Group not found.</p>

  const isMember = !!group.my_role
  const tabs = [
    { key: 'chat', label: 'Chat' },
    { key: 'members', label: 'Members' },
    ...(group.is_educational ? [{ key: 'education', label: 'Classroom' }] : []),
  ]

  return (
    <div className="space-y-4">
      <div className="soft-card rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-2xl font-bold text-primary">
            {group.avatar_url ? <img src={group.avatar_url} alt="" className="h-full w-full object-cover" /> : group.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate font-display text-lg font-bold">{group.name}</h1>
              {group.privacy === 'private' ? <Lock size={14} className="text-gray-400" /> : <Globe size={14} className="text-gray-400" />}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{group.category} &middot; {group.member_count} members</p>
            {group.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{group.description}</p>}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {!isMember && (
            <button onClick={handleJoin} disabled={joining} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {joining ? 'Please wait...' : group.privacy === 'private' ? 'Request to join' : 'Join group'}
            </button>
          )}
          {isMember && group.my_role !== 'owner' && (
            <button onClick={handleLeave} className="flex items-center gap-1 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium dark:border-white/10">
              <LogOut size={14} /> Leave
            </button>
          )}
          {group.my_role === 'owner' && (
            <button onClick={handleDelete} className="flex items-center gap-1 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-500">
              <Trash2 size={14} /> Delete group
            </button>
          )}
        </div>
      </div>

      {!isMember ? (
        <p className="py-10 text-center text-gray-400">Join this group to see its chat and members.</p>
      ) : (
        <>
          <div className="flex gap-1 rounded-full border border-gray-200 p-1 dark:border-white/10">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 rounded-full py-1.5 text-sm font-medium transition ${tab === t.key ? 'bg-primary text-white' : 'text-gray-500'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'chat' && <GroupChat group={group} />}
          {tab === 'members' && <GroupMembers group={group} onGroupChanged={load} />}
          {tab === 'education' && <GroupEducation group={group} />}
        </>
      )}
    </div>
  )
}
