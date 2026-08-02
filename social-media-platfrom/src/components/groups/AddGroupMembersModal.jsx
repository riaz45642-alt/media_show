import { useEffect, useMemo, useState } from 'react'
import { Check, Search, UserPlus } from 'lucide-react'
import Modal from '../ui/Modal'
import Avatar from '../ui/Avatar'
import * as groupService from '../../services/groupService'

export default function AddGroupMembersModal({ open, onClose, groupId, existingMemberIds, onAdded }) {
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    const timer = setTimeout(() => {
      groupService.searchUsers(query)
        .then((users) => active && setPeople(users))
        .catch((err) => active && setError(err.message))
        .finally(() => active && setLoading(false))
    }, 200)
    return () => { active = false; clearTimeout(timer) }
  }, [open, query])

  const existing = useMemo(() => new Set(existingMemberIds.map(String)), [existingMemberIds])
  const available = people.filter((person) => !existing.has(String(person.id)))

  const close = () => {
    setQuery('')
    setSelected([])
    setError('')
    onClose()
  }

  const add = async () => {
    if (!selected.length) return
    setSaving(true)
    setError('')
    try {
      const result = await groupService.addMembers(groupId, selected)
      await onAdded?.(result)
      close()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Add members">
      <div className="space-y-3 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-white/5"
          />
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {loading && <p className="py-6 text-center text-sm text-gray-400">Finding people...</p>}
          {!loading && available.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">No additional members found.</p>
          )}
          {!loading && available.map((person) => {
            const checked = selected.includes(String(person.id))
            return (
              <button
                type="button"
                key={person.id}
                onClick={() => setSelected((items) => checked
                  ? items.filter((id) => id !== String(person.id))
                  : [...items, String(person.id)])}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <Avatar name={person.name} src={person.avatar_url} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{person.name}</p>
                  {person.username && <p className="truncate text-xs text-gray-400">@{person.username}</p>}
                </div>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${checked ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
                  {checked && <Check size={12} />}
                </span>
              </button>
            )
          })}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="button"
          onClick={add}
          disabled={!selected.length || saving}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          <UserPlus size={16} />
          {saving ? 'Adding...' : `Add members${selected.length ? ` (${selected.length})` : ''}`}
        </button>
      </div>
    </Modal>
  )
}
