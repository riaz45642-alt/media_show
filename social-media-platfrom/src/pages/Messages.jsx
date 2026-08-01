import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageCircle, ShieldCheck, Search, Archive, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ChatListItem from '../components/chat/ChatListItem'
import ConversationView from '../components/messages/ConversationView'
import { useChat } from '../context/ChatContext'
import useDebouncedValue from '../hooks/useDebouncedValue'
import * as chatService from '../services/chatService'
import Avatar from '../components/ui/Avatar'

export default function Messages() {
  const { conversations, togglePin, toggleArchive, deleteConversation, findOrCreateConversation, chatError } = useChat()
  const navigate = useNavigate()
  const { id: activeId } = useParams()
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [people, setPeople] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const debouncedQuery = useDebouncedValue(query, 200)

  useEffect(() => {
    if (!debouncedQuery.trim()) { setPeople([]); return }
    let active = true
    setSearching(true)
    setSearchError('')
    chatService.searchUsers(debouncedQuery.trim())
      .then((rows) => active && setPeople(rows))
      .catch(() => active && setPeople([]))
      .finally(() => active && setSearching(false))
    return () => { active = false }
  }, [debouncedQuery])

  const openUser = async (person) => {
    if (!person.can_message) return
    try {
      const conversation = await findOrCreateConversation(person.id)
      navigate(`/messages/${conversation.id}`)
    } catch {
      setSearchError('Unable to start conversation.')
    }
  }

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
    return c.participant?.name?.toLowerCase().includes(q) || c.participant?.username?.toLowerCase().includes(q)
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

  const unreadFor = (c) => c.unread ?? c.messages.filter((m) => m.senderId !== 'me' && m.status !== 'seen').length

  const renderItem = (c) => {
    const user = c.participant
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
      {chatError && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{chatError}</div>}

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

      {query.trim() && (
        <div className="mb-5 space-y-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-card dark:border-white/10 dark:bg-white/5">
          {searching && <p className="p-3 text-center text-xs text-gray-400">Searching people...</p>}
          {!searching && people.map((person) => (
            <button key={person.id} onClick={() => openUser(person)} disabled={!person.can_message}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/5">
              <Avatar name={person.name} src={person.avatar_url} size={38} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{person.name}</span><span className="block truncate text-xs text-gray-400">@{person.username}{person.is_following ? ' · Following' : ''}</span></span>
              {!person.can_message && <span className="text-[10px] text-gray-400">Private</span>}
            </button>
          ))}
          {!searching && people.length === 0 && <p className="p-3 text-center text-xs text-gray-400">No users found.</p>}
          {searchError && <p className="p-3 text-center text-xs text-red-500">{searchError}</p>}
        </div>
      )}

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
