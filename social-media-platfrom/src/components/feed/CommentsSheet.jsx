import { useState } from 'react'
import { Send } from 'lucide-react'
import Modal from '../ui/Modal'
import Avatar from '../ui/Avatar'
import { useLanguage } from '../../context/LanguageContext'
import { usePosts } from '../../context/PostsContext'

export default function CommentsSheet({ post, open, onClose }) {
  const { t } = useLanguage()
  const { addComment } = usePosts()
  const [text, setText] = useState('')

  if (!post) return null

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addComment(post.id, text)
    setText('')
  }

  return (
    <Modal open={open} onClose={onClose} title={t('comment')}>
      <div className="max-h-[50vh] space-y-3.5 overflow-y-auto pr-1">
        {post.comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">—</p>
        ) : (
          post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <Avatar name={c.author} size={32} />
              <div className="flex-1 rounded-2xl bg-gray-50 dark:bg-white/5 px-3.5 py-2">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{c.author}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="mt-4 flex items-center gap-2 border-t border-gray-100 dark:border-white/10 pt-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('add_comment')}
          className="focus-ring flex-1 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="tap-scale flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </Modal>
  )
}
