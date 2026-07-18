import { useState } from 'react'
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react'
import Avatar from '../ui/Avatar'

export default function ConversationView({ thread, initialMessages, onBack }) {
  const [messages, setMessages] = useState(initialMessages)
  const [text, setText] = useState('')

  const send = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((prev) => [...prev, { id: `m-${Date.now()}`, mine: true, text: trimmed }])
    setText('')
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          className="tap-scale flex h-9 w-9 items-center justify-center rounded-full hover:bg-primary/10 text-gray-500 dark:text-gray-300"
        >
          <ArrowLeft size={18} />
        </button>
        <Avatar name={thread.name} color={thread.color} size={36} />
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{thread.name}</p>
          <p className="flex items-center gap-1 text-[11px] text-gray-400">
            <ShieldCheck size={11} /> Screened for safety
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto rounded-2xl bg-gray-50/60 dark:bg-white/5 p-3.5">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                m.mine
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-200 rounded-bl-md shadow-card'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="focus-ring flex-1 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm outline-none"
        />
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
