import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageCircle, ShieldCheck, Search, Archive, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ChatListItem from '../components/chat/ChatListItem'
import ConversationView from '../components/messages/ConversationView'
import { useChat } from '../context/ChatContext'
import { findUser } from '../data/messages'

export default function Messages() {
  const { conversations, togglePin, toggleArchive, deleteConversation } = useChat()
  const navigate = useNavigate()
  const { id: activeId } = useParams()
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  )

  if (activeConversation) {
    return <ConversationView conversation={activeConversation} onBack={() => navigate('/messages')} />
  }

  const q = query.trim().toLowerCase()
  const matches = (c) => {
    if (!q) return true
    const user = findUser(c.participantId)
    return user?.name?.toLowerCase().includes(q)
  }

  const visible = conversations.filter((c) => !c.archived && matches(c))
  const archived = conversations.filter((c) => c.archived && matches(c))
  const pinned = visible.filter((c) => c.pinned)
  const regular = visible.filter((c) => !c.pinned)

  const sortByRecent = (list) =>
    [...list].sort((a, b) => {
      const ta = a.messages[a.messages.length - 1]?.time || ''
      const tb = b.messages[b.messages.length - 1]?.time || ''
      return tb.localeCompare(ta)
    })

  const unreadFor = (c) => c.messages.filter((m) => m.senderId !== 'me' && m.status !== 'seen').length

  const renderItem = (c) => {
    const user = findUser(c.participantId)
    return (
      <ChatListItem
        key={c.id}
        conversation={c}
        user={user}
        unread={unreadFor(c)}
        onClick={() => navigate(`/messages/${c.id}`)}
        onPin={() => togglePin(c.id)}
        onArchive={() => toggleArchive(c.id)}
        onDelete={() => deleteConversation(c.id)}
      />
    )
  }

  return (
    <div>
      <PageHeader title="Chat" subtitle="All chats are monitored by Smart Ethical Shield." />

      <div className="mb-5 flex items-center gap-2 rounded-2xl bg-secondary/10 p-3.5 text-xs text-secondary-dark dark:text-secondary">
        <ShieldCheck size={16} className="shrink-0" />
        Messages are automatically screened for safety in real time.
      </div>

      <div className="relative mb-4">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations"
          className="focus-ring w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 py-2.5 pl-9 pr-3 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 outline-none"
        />
      </div>

      {conversations.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No conversations yet" description="Start chatting with friends safely." />
      ) : (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Pinned</p>
              <div className="space-y-2">{sortByRecent(pinned).map(renderItem)}</div>
            </div>
          )}

          <div>
            {pinned.length > 0 && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">All chats</p>}
            {regular.length === 0 ? (
              pinned.length === 0 && (
                <EmptyState icon={MessageCircle} title="No conversations found" description="Try a different search." />
              )
            ) : (
              <div className="space-y-2">{sortByRecent(regular).map(renderItem)}</div>
            )}
          </div>

          {archived.length > 0 && (
            <div>
              <button
                onClick={() => setShowArchived((s) => !s)}
                className="tap-scale flex w-full items-center justify-between rounded-2xl bg-gray-50 dark:bg-white/5 px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300"
              >
                <span className="flex items-center gap-1.5">
                  <Archive size={13} /> Archived ({archived.length})
                </span>
                {showArchived ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showArchived && <div className="mt-2 space-y-2">{sortByRecent(archived).map(renderItem)}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
