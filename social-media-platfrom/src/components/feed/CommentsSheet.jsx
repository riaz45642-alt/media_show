import { useState } from 'react'
import { Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import Modal from '../ui/Modal'
import Avatar from '../ui/Avatar'
import { useLanguage } from '../../context/LanguageContext'
import { usePosts } from '../../context/PostsContext'
import ContentFilterWarning from '../common/ContentFilterWarning'
import { filterTextContent } from '../../utils/contentFilter'

export default function CommentsSheet({ post, open, onClose }) {
  const { t } = useLanguage()
  const { addComment } = usePosts()
  const [text, setText] = useState('')
  const [blockedTerms, setBlockedTerms] = useState([])
  const [error, setError] = useState('')

  if (!post) return null

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    const filtered = filterTextContent(text)
    setBlockedTerms(filtered.blockedTerms)
    if (!filtered.allowed) return
    try {
      await addComment(post.id, text)
      setText('')
      setError('')
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('comment')}>
      <div className="max-h-[50vh] space-y-3.5 overflow-y-auto pr-1">
        {post.comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">—</p>
        ) : (
          post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <Link to={`/users/${c.authorId}`} onClick={onClose} aria-label={`Open ${c.author}'s profile`}>
                <Avatar name={c.author} src={c.avatarSrc || c.avatar_url || c.avatar} size={32} />
              </Link>
              <div className="flex-1 rounded-2xl bg-gray-50 dark:bg-white/5 px-3.5 py-2">
                <Link to={`/users/${c.authorId}`} onClick={onClose} className="text-xs font-semibold text-gray-800 hover:underline dark:text-gray-100">{c.author}</Link>
                <p className="text-sm text-gray-600 dark:text-gray-300">{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="mt-4 flex items-center gap-2 border-t border-gray-100 dark:border-white/10 pt-4">
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setBlockedTerms([]); setError('') }}
          placeholder={t('add_comment')}
          aria-invalid={blockedTerms.length > 0}
          className={`focus-ring flex-1 rounded-full border bg-white dark:bg-white/5 px-4 py-2.5 text-sm outline-none ${blockedTerms.length ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="tap-scale flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
      <ContentFilterWarning matches={blockedTerms} />
      {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
    </Modal>
  )
}
