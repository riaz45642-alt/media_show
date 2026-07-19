import { useState } from 'react'
import { Send } from 'lucide-react'
import Modal from '../ui/Modal'
import Avatar from '../ui/Avatar'

export default function ReelCommentsSheet({ open, onClose, comments, onAdd }) {
  const [text, setText] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setText('')
  }

  return (
    <Modal open={open} onClose={onClose} title={`Comments (${comments.length})`}>
      <div className="max-h-80 space-y-3.5 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Be the first to comment.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <Avatar name={c.author} size={32} />
              <div>
                <p className="text-sm">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">{c.author} </span>
                  <span className="text-gray-600 dark:text-gray-300">{c.text}</span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={submit} className="mt-4 flex items-center gap-2 border-t border-gray-100 dark:border-white/10 pt-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="focus-ring flex-1 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Post comment"
          className="tap-scale flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </Modal>
  )
}
