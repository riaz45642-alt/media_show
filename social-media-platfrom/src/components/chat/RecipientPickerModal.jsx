import { useMemo, useState } from 'react'
import { Search, Check, SendHorizontal, CheckCircle2 } from 'lucide-react'
import Modal from '../ui/Modal'
import Avatar from '../ui/Avatar'
import { useChat } from '../../context/ChatContext'
import { USERS, FOLLOWERS, FOLLOWING } from '../../data/users'

export default function RecipientPickerModal({ open, onClose, title = 'Send to', onConfirm, confirmLabel = 'Send' }) {
  const { conversations } = useChat()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [sent, setSent] = useState(false)

  const recentIds = useMemo(
    () =>
      [...conversations]
        .filter((c) => !c.archived)
        .sort((a, b) => {
          const ta = a.messages[a.messages.length - 1]?.time || ''
          const tb = b.messages[b.messages.length - 1]?.time || ''
          return tb.localeCompare(ta)
        })
        .map((c) => c.participantId),
    [conversations]
  )

  const people = useMemo(() => {
    const seen = new Set()
    const list = []
    const addAll = (ids) => {
      ids.forEach((id) => {
        if (seen.has(id)) return
        const u = USERS.find((x) => x.id === id)
        if (!u) return
        seen.add(id)
        list.push(u)
      })
    }
    addAll(recentIds)
    addAll(FOLLOWING.map((u) => u.id))
    addAll(FOLLOWERS.map((u) => u.id))
    if (!query.trim()) return list
    const q = query.trim().toLowerCase()
    return list.filter((u) => u.name.toLowerCase().includes(q))
  }, [recentIds, query])

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleClose = () => {
    setSelected([])
    setQuery('')
    setSent(false)
    onClose()
  }

  const handleConfirm = () => {
    if (selected.length === 0) return
    onConfirm(selected)
    setSent(true)
    setTimeout(handleClose, 1200)
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {sent ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center animate-scaleIn">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/15 text-secondary-dark">
            <CheckCircle2 size={28} />
          </span>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sent!</p>
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people"
              className="focus-ring w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 py-2.5 pl-9 pr-3 text-sm outline-none"
            />
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto">
            {people.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No people found</p>
            ) : (
              people.map((u) => {
                const isSelected = selected.includes(u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className="tap-scale flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <div className="relative shrink-0">
                      <Avatar name={u.name} src={u.avatar} color={u.color} size={40} />
                      {u.isOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-secondary ring-2 ring-white dark:ring-[#161C2C]" />
                      )}
                    </div>
                    <span className="flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-200">{u.name}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300 dark:border-white/20'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <button
            onClick={handleConfirm}
            disabled={selected.length === 0}
            className="btn-press tap-scale focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <SendHorizontal size={16} />
            {confirmLabel}
            {selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </>
      )}
    </Modal>
  )
}
