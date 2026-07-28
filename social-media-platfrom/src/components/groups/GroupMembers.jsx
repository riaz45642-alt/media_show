import { useEffect, useState } from 'react'
import { Crown, Shield, UserMinus, Check, X } from 'lucide-react'
import * as groupService from '../../services/groupService'
import { useAuth } from '../../context/AuthContext'

export default function GroupMembers({ group, onGroupChanged }) {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])
  const isOwner = group.my_role === 'owner'
  const isAdmin = ['owner', 'admin'].includes(group.my_role)

  const load = async () => {
    const [m, r] = await Promise.all([
      groupService.listMembers(group.id),
      isAdmin ? groupService.listJoinRequests(group.id) : Promise.resolve([]),
    ])
    setMembers(m)
    setRequests(r)
  }

  useEffect(() => { load() }, [group.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const promote = async (userId, role) => {
    await groupService.setMemberRole(group.id, userId, role).catch((e) => alert(e.message))
    load()
  }
  const remove = async (userId) => {
    if (!confirm('Remove this member?')) return
    await groupService.removeMember(group.id, userId).catch((e) => alert(e.message))
    load()
  }
  const review = async (requestId, approve) => {
    await groupService.reviewJoinRequest(group.id, requestId, approve).catch((e) => alert(e.message))
    load()
    onGroupChanged?.()
  }
  const doTransfer = async (userId) => {
    if (!confirm('Transfer group ownership to this member? You will become an admin.')) return
    await groupService.transferOwnership(group.id, userId).catch((e) => alert(e.message))
    load()
    onGroupChanged?.()
  }

  return (
    <div className="space-y-4">
      {isAdmin && requests.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Join requests</h3>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-white/10">
                <span className="text-sm">{r.display_name}</span>
                <div className="flex gap-1">
                  <button onClick={() => review(r.id, true)} className="rounded-full bg-green-500/10 p-1.5 text-green-600" aria-label="Approve"><Check size={14} /></button>
                  <button onClick={() => review(r.id, false)} className="rounded-full bg-red-500/10 p-1.5 text-red-600" aria-label="Reject"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-500">{members.length} members</h3>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{m.display_name}</span>
                {m.role === 'owner' && <Crown size={14} className="text-yellow-500" />}
                {m.role === 'admin' && <Shield size={14} className="text-primary" />}
              </div>
              {isAdmin && m.user_id !== user.id && m.role !== 'owner' && (
                <div className="flex items-center gap-1">
                  {isOwner && (
                    <button onClick={() => promote(m.user_id, m.role === 'admin' ? 'member' : 'admin')}
                      className="rounded-full px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                      {m.role === 'admin' ? 'Demote' : 'Promote'}
                    </button>
                  )}
                  {isOwner && (
                    <button onClick={() => doTransfer(m.user_id)} className="rounded-full px-2 py-1 text-xs font-medium hover:bg-black/5">
                      Make owner
                    </button>
                  )}
                  <button onClick={() => remove(m.user_id)} className="rounded-full p-1.5 text-red-500 hover:bg-red-500/10" aria-label="Remove member">
                    <UserMinus size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
