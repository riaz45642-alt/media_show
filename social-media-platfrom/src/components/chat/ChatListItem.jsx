import { useState } from 'react'
import { Pin, Archive, Trash2, MoreVertical } from 'lucide-react'
import Avatar from '../ui/Avatar'

function preview(message) {
  if (!message) return 'Say hi 👋'
  switch (message.type) {
    case 'image': return '📷 Photo'
    case 'video': return '🎥 Video'
    case 'link': return '🔗 Link'
    case 'shared': return `Sent a ${message.shared?.kind || 'post'}`
    default: return message.text
  }
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.round(hrs / 24)}d`
}

export default function ChatListItem({ conversation, user, unread, onClick, onPin, onArchive, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const lastMessage = conversation.messages[conversation.messages.length - 1]

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="soft-card w-full flex items-center gap-3.5 p-4 text-left hover-lift animate-slideUp"
      >
        <div className="relative shrink-0">
          <Avatar name={user?.name || 'User'} src={user?.avatar} color={user?.color} size={46} />
          {user?.isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-secondary ring-2 ring-white dark:ring-[#161C2C]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              {conversation.pinned && <Pin size={11} className="shrink-0 text-primary" />}
              {user?.name || 'Unknown'}
            </p>
            <span className="shrink-0 text-xs text-gray-400">{lastMessage ? timeAgo(lastMessage.time) : ''}</span>
          </div>
          <p className={`truncate mt-0.5 text-xs ${unread > 0 ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
            {lastMessage?.senderId === 'me' && 'You: '}
            {preview(lastMessage)}
          </p>
        </div>
        {unread > 0 && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
        aria-label="Conversation options"
        className="tap-scale absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
      >
        <MoreVertical size={15} />
      </button>

      {menuOpen && (
        <div className="soft-card absolute right-3 top-11 z-20 w-40 overflow-hidden p-1 shadow-soft animate-scaleIn">
          <button
            onClick={() => { onPin(); setMenuOpen(false) }}
            className="tap-scale flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <Pin size={13} /> {conversation.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            onClick={() => { onArchive(); setMenuOpen(false) }}
            className="tap-scale flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <Archive size={13} /> {conversation.archived ? 'Unarchive' : 'Archive'}
          </button>
          <button
            onClick={() => { onDelete(); setMenuOpen(false) }}
            className="tap-scale flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-red-500 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}
