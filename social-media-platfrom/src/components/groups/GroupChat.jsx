import { useEffect, useRef, useState } from 'react'
import { Send, Paperclip, Pin, Reply, Trash2, X } from 'lucide-react'
import * as groupService from '../../services/groupService'
import { getSocket } from '../../services/socketService'
import { useAuth } from '../../context/AuthContext'

function bytesToFileType(file) {
  if (file.type.startsWith('image')) return 'image'
  if (file.type.startsWith('video')) return 'video'
  return 'document'
}

export default function GroupChat({ group }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [typingUsers, setTypingUsers] = useState({})
  const [pinned, setPinned] = useState([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileRef = useRef(null)

  const canModerate = ['owner', 'admin'].includes(group.my_role)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Promise.all([groupService.listMessages(group.id), groupService.listPinned(group.id)])
      .then(([msgs, pins]) => {
        if (!mounted) return
        setMessages(msgs)
        setPinned(pins)
      })
      .finally(() => mounted && setLoading(false))

    const socket = getSocket()
    if (!socket) return
    socket.emit('group:join', { groupId: group.id })

    const onMessage = (msg) => setMessages((prev) => [...prev, msg])
    const onDeleted = ({ messageId }) => setMessages((prev) => prev.filter((m) => m.id !== messageId))
    const onTyping = ({ userId, isTyping }) => {
      if (userId === user.id) return
      setTypingUsers((prev) => ({ ...prev, [userId]: isTyping }))
    }
    const onPinned = () => groupService.listPinned(group.id).then(setPinned)
    const onUnpinned = () => groupService.listPinned(group.id).then(setPinned)

    socket.on('group:message', onMessage)
    socket.on('group:message-deleted', onDeleted)
    socket.on('group:typing', onTyping)
    socket.on('group:message-pinned', onPinned)
    socket.on('group:message-unpinned', onUnpinned)

    return () => {
      mounted = false
      socket.emit('group:leave', { groupId: group.id })
      socket.off('group:message', onMessage)
      socket.off('group:message-deleted', onDeleted)
      socket.off('group:typing', onTyping)
      socket.off('group:message-pinned', onPinned)
      socket.off('group:message-unpinned', onUnpinned)
    }
  }, [group.id, group.my_role, user.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const notifyTyping = (isTyping) => {
    getSocket()?.emit('group:typing', { groupId: group.id, isTyping })
  }

  const handleTextChange = (e) => {
    setText(e.target.value)
    notifyTyping(true)
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => notifyTyping(false), 1500)
  }

  const send = async () => {
    if (!text.trim()) return
    const body = text.trim()
    setText('')
    setReplyTo(null)
    notifyTyping(false)
    try {
      await groupService.sendMessage(group.id, { body, replyToId: replyTo?.id })
    } catch { /* the socket event still arrives if the request eventually succeeds */ }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // Small/demo-friendly approach: base64 data URL, matching this app's
    // existing pattern of not requiring a separate object-storage service.
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        await groupService.sendMessage(group.id, {
          fileUrl: reader.result,
          fileName: file.name,
          fileType: bytesToFileType(file),
        })
      } catch (err) {
        alert(err.message)
      }
    }
    reader.readAsDataURL(file)
  }

  const deleteMsg = async (id) => {
    if (!confirm('Delete this message?')) return
    await groupService.deleteMessage(group.id, id).catch((err) => alert(err.message))
  }

  const togglePin = async (msg) => {
    const isPinned = pinned.some((p) => p.id === msg.id)
    await (isPinned ? groupService.unpinMessage(group.id, msg.id) : groupService.pinMessage(group.id, msg.id)).catch((err) => alert(err.message))
  }

  const typingNames = Object.entries(typingUsers).filter(([, v]) => v).map(([id]) => id)

  if (loading) return <p className="py-8 text-center text-gray-400">Loading chat...</p>

  return (
    <div className="flex h-[65vh] flex-col rounded-xl border border-gray-100 bg-white/60 dark:border-white/10 dark:bg-white/5">
      {pinned.length > 0 && (
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-white/10">
          <Pin size={12} /> {pinned.length} pinned message{pinned.length > 1 ? 's' : ''}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((m) => {
          const mine = m.sender_id === user.id
          const isPinned = pinned.some((p) => p.id === m.id)
          return (
            <div key={m.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10'}`}>
                {!mine && <p className="mb-0.5 text-xs font-semibold opacity-70">{m.sender_name}</p>}
                {m.reply_to_id && <p className="mb-1 truncate rounded bg-black/10 px-2 py-1 text-xs opacity-80">replying to a message</p>}
                {m.file_url && m.file_type === 'image' && <img src={m.file_url} alt={m.file_name} className="mb-1 max-h-52 rounded-lg" />}
                {m.file_url && m.file_type === 'video' && <video src={m.file_url} controls className="mb-1 max-h-52 rounded-lg" />}
                {m.file_url && !['image', 'video'].includes(m.file_type) && (
                  <a href={m.file_url} download={m.file_name} className="mb-1 flex items-center gap-1 underline">
                    <Paperclip size={12} /> {m.file_name || 'Attachment'}
                  </a>
                )}
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                <p className="mt-1 text-[10px] opacity-60">{new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{isPinned ? ' · Pinned' : ''}</p>
              </div>
              <div className="ml-1 hidden items-center gap-1 self-center group-hover:flex">
                <button onClick={() => setReplyTo(m)} className="rounded-full p-1 hover:bg-black/5" aria-label="Reply"><Reply size={14} /></button>
                {canModerate && <button onClick={() => togglePin(m)} className="rounded-full p-1 hover:bg-black/5" aria-label="Pin"><Pin size={14} /></button>}
                {(mine || canModerate) && <button onClick={() => deleteMsg(m.id)} className="rounded-full p-1 hover:bg-black/5" aria-label="Delete"><Trash2 size={14} /></button>}
              </div>
            </div>
          )
        })}
        {typingNames.length > 0 && <p className="text-xs italic text-gray-400">Someone is typing...</p>}
        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5 text-xs text-gray-500 dark:border-white/10">
          <span className="truncate">Replying to: {replyTo.body || replyTo.file_name || 'message'}</span>
          <button onClick={() => setReplyTo(null)}><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-gray-100 p-2 dark:border-white/10">
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} className="rounded-full p-2 hover:bg-black/5" aria-label="Attach file"><Paperclip size={18} /></button>
        <input
          value={text}
          onChange={handleTextChange}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Message the group..."
          className="flex-1 rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5"
        />
        <button onClick={send} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white" aria-label="Send"><Send size={16} /></button>
      </div>
    </div>
  )
}
