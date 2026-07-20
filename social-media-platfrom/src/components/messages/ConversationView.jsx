import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ShieldCheck, MoreVertical, Trash2, Archive, Pin } from 'lucide-react'
import Avatar from '../ui/Avatar'
import MessageBubble from '../chat/MessageBubble'
import ChatComposer from '../chat/ChatComposer'
import TypingDots from '../chat/TypingDots'
import RecipientPickerModal from '../chat/RecipientPickerModal'
import { useChat } from '../../context/ChatContext'

export default function ConversationView({ conversation, onBack }) {
  const { sendMessage, deleteMessage, deleteConversation, togglePin, toggleArchive, markAsRead, forwardMessage, typing, findUser } =
    useChat()
  const user = findUser(conversation.participantId)
  const [replyTo, setReplyTo] = useState(null)
  const [forwardTarget, setForwardTarget] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const scrollRef = useRef(null)
  const isTyping = !!typing[conversation.id]

  useEffect(() => {
    markAsRead(conversation.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [conversation.messages.length, isTyping])

  const handleSend = (payload) => {
    sendMessage(conversation.id, payload)
    setReplyTo(null)
  }

  const handleCopy = async (message) => {
    const text = message.type === 'shared' ? message.shared?.title : message.text
    try {
      await navigator.clipboard.writeText(text || '')
    } catch {
      /* clipboard may be unavailable in sandboxed preview — ignore */
    }
  }

  const findMessage = (id) => conversation.messages.find((m) => m.id === id)

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back to conversations"
            className="tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 text-gray-500 dark:text-gray-300"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="relative shrink-0">
            <Avatar name={user?.name || 'User'} src={user?.avatar} color={user?.color} size={38} />
            {user?.isOnline && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-secondary ring-2 ring-white dark:ring-[#0F1420]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{user?.name || 'Unknown'}</p>
            <p className="flex items-center gap-1 text-[11px] text-gray-400">
              {isTyping ? (
                <span className="text-primary font-medium">typing…</span>
              ) : (
                <>
                  <ShieldCheck size={11} /> {user?.isOnline ? 'Active now' : 'Screened for safety'}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Conversation options"
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-full hover:bg-primary/10 text-gray-500 dark:text-gray-300"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="soft-card absolute right-0 top-11 z-20 w-44 overflow-hidden p-1 shadow-soft animate-scaleIn">
              <button
                onClick={() => { togglePin(conversation.id); setMenuOpen(false) }}
                className="tap-scale flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <Pin size={13} /> {conversation.pinned ? 'Unpin chat' : 'Pin chat'}
              </button>
              <button
                onClick={() => { toggleArchive(conversation.id); setMenuOpen(false); onBack() }}
                className="tap-scale flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <Archive size={13} /> {conversation.archived ? 'Unarchive' : 'Archive chat'}
              </button>
              <button
                onClick={() => { deleteConversation(conversation.id); setMenuOpen(false); onBack() }}
                className="tap-scale flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-red-500 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <Trash2 size={13} /> Delete chat
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto rounded-2xl bg-gray-50/60 dark:bg-white/5 p-3.5">
        {conversation.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Avatar name={user?.name || 'User'} src={user?.avatar} color={user?.color} size={56} />
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{user?.name}</p>
            <p className="max-w-[220px] text-xs text-gray-400">Say hi 👋 — your conversation will show up here.</p>
          </div>
        ) : (
          conversation.messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              mine={m.senderId === 'me'}
              replyPreview={
                m.replyTo
                  ? (() => {
                      const original = findMessage(m.replyTo)
                      if (!original) return null
                      return original.type === 'text' ? original.text : original.type === 'shared' ? original.shared?.title : 'Attachment'
                    })()
                  : null
              }
              onReply={setReplyTo}
              onForward={setForwardTarget}
              onCopy={handleCopy}
              onDelete={(msg) => deleteMessage(conversation.id, msg.id)}
            />
          ))
        )}
        {isTyping && <TypingDots />}
      </div>

      <div className="mt-3">
        <ChatComposer onSend={handleSend} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      </div>

      <RecipientPickerModal
        open={!!forwardTarget}
        onClose={() => setForwardTarget(null)}
        title="Forward message"
        confirmLabel="Forward"
        onConfirm={(recipientIds) => forwardMessage(forwardTarget, recipientIds)}
      />
    </div>
  )
}
