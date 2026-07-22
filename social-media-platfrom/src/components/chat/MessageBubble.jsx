import { useState } from 'react'
import { Check, CheckCheck, CornerUpLeft, Forward, Copy, Trash2, MoreHorizontal } from 'lucide-react'
import SharedContentBubble from './SharedContentBubble'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function MessageBubble({ message, mine, replyPreview, onReply, onForward, onDelete, onCopy }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className={`group flex items-end gap-1.5 ${mine ? 'justify-end' : 'justify-start'}`}>
      {mine && (
        <div className="relative flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Message options"
            className="tap-scale flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <MessageMenu
              mine={mine}
              onReply={() => { onReply(message); closeMenu() }}
              onForward={() => { onForward(message); closeMenu() }}
              onCopy={() => { onCopy(message); closeMenu() }}
              onDelete={() => { onDelete(message); closeMenu() }}
              onClose={closeMenu}
            />
          )}
        </div>
      )}

      <div className={`flex max-w-[75%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {message.forwarded && (
          <span className="mb-0.5 flex items-center gap-1 text-[10px] italic text-gray-400">
            <Forward size={10} /> Forwarded
          </span>
        )}
        {replyPreview && (
          <div
            className={`mb-1 max-w-full truncate rounded-xl border-l-2 px-2.5 py-1 text-[11px] ${
              mine
                ? 'border-white/40 bg-primary/70 text-white/90'
                : 'border-primary/40 bg-primary/5 text-gray-500 dark:text-gray-300'
            }`}
          >
            {replyPreview}
          </div>
        )}

        {message.type === 'shared' ? (
          <SharedContentBubble shared={message.shared} mine={mine} />
        ) : message.type === 'image' ? (
          <div className={`overflow-hidden rounded-2xl ${mine ? 'rounded-br-md' : 'rounded-bl-md'} shadow-card`}>
            <img src={message.mediaUrl} alt="Shared" className="max-h-64 w-full max-w-[240px] object-cover" />
          </div>
        ) : message.type === 'video' ? (
          <div className={`overflow-hidden rounded-2xl ${mine ? 'rounded-br-md' : 'rounded-bl-md'} shadow-card`}>
            <video src={message.mediaUrl} controls className="max-h-64 w-full max-w-[240px] object-cover" />
          </div>
        ) : message.type === 'link' ? (
          <a
            href={message.text}
            target="_blank"
            rel="noreferrer"
            className={`max-w-full break-all rounded-2xl px-3.5 py-2 text-sm underline ${
              mine ? 'bg-primary text-white rounded-br-md' : 'bg-white dark:bg-white/10 text-primary rounded-bl-md shadow-card'
            }`}
          >
            {message.text}
          </a>
        ) : (
          <div
            className={`max-w-full whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
              message.flagged
                ? 'border border-dashed border-red-300 bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-300'
                : mine
                ? 'bg-primary text-white rounded-br-md'
                : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-200 rounded-bl-md shadow-card'
            }`}
          >
            {message.flagged ? "This message wasn't sent — it may go against Media Show's community guidelines." : message.text}
          </div>
        )}

        <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-gray-400">
          <span>{formatTime(message.time)}</span>
          {mine && (
            message.status === 'seen' ? (
              <CheckCheck size={12} className="text-primary" />
            ) : message.status === 'delivered' ? (
              <CheckCheck size={12} />
            ) : (
              <Check size={12} />
            )
          )}
        </div>
      </div>

      {!mine && (
        <div className="relative flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Message options"
            className="tap-scale flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <MessageMenu
              mine={mine}
              onReply={() => { onReply(message); closeMenu() }}
              onForward={() => { onForward(message); closeMenu() }}
              onCopy={() => { onCopy(message); closeMenu() }}
              onDelete={() => { onDelete(message); closeMenu() }}
              onClose={closeMenu}
            />
          )}
        </div>
      )}
    </div>
  )
}

function MessageMenu({ mine, onReply, onForward, onCopy, onDelete }) {
  return (
    <div
      className={`soft-card absolute top-full z-20 mt-1 w-36 overflow-hidden p-1 shadow-soft animate-scaleIn ${
        mine ? 'right-0' : 'left-0'
      }`}
    >
      <MenuItem icon={CornerUpLeft} label="Reply" onClick={onReply} />
      <MenuItem icon={Forward} label="Forward" onClick={onForward} />
      <MenuItem icon={Copy} label="Copy" onClick={onCopy} />
      <MenuItem icon={Trash2} label="Delete" onClick={onDelete} danger />
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`tap-scale flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100 dark:hover:bg-white/10 ${
        danger ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  )
}
