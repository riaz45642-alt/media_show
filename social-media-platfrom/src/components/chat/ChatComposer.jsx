import { useRef, useState } from 'react'
import { Send, Smile, Image as ImageIcon, X, CornerUpLeft } from 'lucide-react'
import EmojiPicker from './EmojiPicker'

export default function ChatComposer({ onSend, replyTo, onCancelReply }) {
  const [text, setText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const fileInputRef = useRef(null)

  const send = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    const isLink = /^https?:\/\/\S+$/i.test(trimmed)
    onSend({ type: isLink ? 'link' : 'text', text: trimmed, replyTo: replyTo?.id || null })
    setText('')
    setEmojiOpen(false)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const isVideo = file.type.startsWith('video/')
    onSend({ type: isVideo ? 'video' : 'image', mediaUrl: url, replyTo: replyTo?.id || null })
    e.target.value = ''
  }

  const insertEmoji = (emoji) => {
    setText((t) => t + emoji)
  }

  return (
    <div>
      {replyTo && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 animate-slideUp">
          <span className="flex min-w-0 items-center gap-1.5">
            <CornerUpLeft size={13} className="shrink-0 text-primary" />
            <span className="truncate">Replying to: {replyTo.type === 'text' ? replyTo.text : replyTo.type === 'shared' ? replyTo.shared?.title : 'Attachment'}</span>
          </span>
          <button onClick={onCancelReply} aria-label="Cancel reply" className="tap-scale shrink-0 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      )}

      <form onSubmit={send} className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image or video"
          className="tap-scale flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-primary/10 dark:text-gray-300"
        >
          <ImageIcon size={19} />
        </button>

        <div className="relative flex-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="focus-ring w-full rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 pr-10 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            aria-label="Add emoji"
            className="tap-scale absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary"
          >
            <Smile size={18} />
          </button>
          {emojiOpen && <EmojiPicker onSelect={insertEmoji} />}
        </div>

        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Send message"
          className="tap-scale flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
