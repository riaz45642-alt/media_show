import { useState } from 'react'
import { Heart, MessageCircle, Share2, Bookmark, Check, X, Send } from 'lucide-react'
import Avatar from '../ui/Avatar'
import SafeBadge from '../common/SafeBadge'
import ContentFilterWarning from '../common/ContentFilterWarning'
import PostMenu from './PostMenu'
import PostMedia from '../feed/PostMedia'
import CommentsSheet from '../feed/CommentsSheet'
import ShareSheet from '../feed/ShareSheet'
import { usePosts } from '../../context/PostsContext'
import { useLanguage } from '../../context/LanguageContext'
import { filterTextContent } from '../../utils/contentFilter'
import { blockedTermAlertMessage } from '../../config/blockedTerms'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PostCard({ post }) {
  const { toggleLike, toggleSave, editPost, addComment } = usePosts()
  const { t } = useLanguage()
  const { user } = useAuth()
  const profilePath = post.authorId === user?.id ? '/profile' : `/users/${post.authorId}`
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(post.text || '')
  const [blockedTerms, setBlockedTerms] = useState([])
  const [commentDraft, setCommentDraft] = useState('')
  const [commentError, setCommentError] = useState('')

  const doubleTapLike = () => {
    if (!post.likedByMe) toggleLike(post.id)
    setHeartBurst(true)
    setTimeout(() => setHeartBurst(false), 700)
  }

  const saveEdit = async () => {
    const filtered = filterTextContent(draft)
    setBlockedTerms(filtered.blockedTerms)
    if (!filtered.allowed) {
      window.alert(blockedTermAlertMessage(filtered.blockedTerms))
      return
    }
    await editPost(post.id, draft.trim())
    setEditing(false)
  }

  const submitComment = async (event) => {
    event.preventDefault()
    const text = commentDraft.trim()
    if (!text) return
    const filtered = filterTextContent(text)
    if (!filtered.allowed) {
      setCommentError(`Please change: ${filtered.blockedTerms.join(', ')}`)
      return
    }
    try {
      await addComment(post.id, text)
      setCommentDraft('')
      setCommentError('')
    } catch (error) {
      setCommentError(error.message)
    }
  }

  return (
    <article className="soft-card overflow-hidden animate-slideUp">
      <div className="flex items-center justify-between p-4 sm:p-5 pb-3">
        <div className="flex items-center gap-3">
          <Link to={profilePath} aria-label={`Open ${post.author}'s profile`}><Avatar name={post.author} src={post.avatarSrc} color={post.avatarColor} size={42} /></Link>
          <div>
            <Link to={profilePath} className="text-sm font-semibold text-gray-800 hover:text-primary dark:text-gray-100">
              {post.author}
            </Link>
            <p className="text-xs text-gray-400">{post.time}{post.edited ? ' · Edited' : ''}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SafeBadge post={post} />
          <PostMenu post={post} onEdit={() => { setDraft(post.text || ''); setEditing(true) }} />
        </div>
      </div>

      {post.media?.length > 0 && (
        <div className="relative px-0" onDoubleClick={doubleTapLike}>
          <PostMedia media={post.media} aspect="aspect-square" rounded="rounded-none" />
          {heartBurst && (
            <Heart
              size={90}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow-lg animate-scaleIn"
            />
          )}
        </div>
      )}

      <div className="p-4 sm:p-5 pt-3.5">
        {editing ? (
          <div className="mb-3.5">
            <textarea
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setBlockedTerms([]) }}
              rows={3}
              aria-invalid={blockedTerms.length > 0}
              className={`w-full rounded-2xl border bg-transparent p-3 text-[15px] text-gray-700 dark:text-gray-200 focus-ring ${blockedTerms.length ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`}
            />
            <ContentFilterWarning matches={blockedTerms} />
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="tap-scale flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-gray-500">
                <X size={13} /> Cancel
              </button>
              <button onClick={saveEdit} className="tap-scale flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                <Check size={13} /> Save
              </button>
            </div>
          </div>
        ) : (
          post.media?.length === 0 && (
            <p className="mb-3.5 text-[15px] leading-relaxed text-gray-700 dark:text-gray-200">{post.text}</p>
          )
        )}

        <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 pt-3 -mt-1">
          <div className="flex items-center gap-4">
            <button
              onClick={() => toggleLike(post.id)}
              className="tap-scale flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
            >
              <Heart size={19} className={post.likedByMe ? 'fill-red-500 text-red-500' : ''} />
              {post.likes}
            </button>
            <button
              onClick={() => setCommentsOpen(true)}
              className="tap-scale flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
            >
              <MessageCircle size={19} />
              {post.commentCount}
            </button>
            <button onClick={() => setShareOpen(true)} className="tap-scale text-gray-500 dark:text-gray-400">
              <Share2 size={19} />
            </button>
          </div>
          <button
            onClick={() => toggleSave(post.id)}
            className={`tap-scale inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200 ${
              post.saved
                ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                : 'bg-secondary/10 text-secondary-dark dark:text-secondary'
            }`}
          >
            <Bookmark size={14} className={post.saved ? 'fill-red-500' : ''} />
            {post.saved ? 'Unsave' : 'Save'}
          </button>
        </div>

        {!editing && post.media?.length > 0 && post.text && (
          <p className="mt-3 text-[15px] leading-relaxed text-gray-700 dark:text-gray-200">
            <span className="font-semibold text-gray-800 dark:text-gray-100">{post.author} </span>
            {post.text}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-gray-700 dark:text-gray-200">
          <span>{post.likes} {post.likes === 1 ? 'like' : 'likes'}</span>
          <button onClick={() => setCommentsOpen(true)} className="text-gray-500 dark:text-gray-400">
            {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
          </button>
        </div>

        {post.comments.slice(-2).map((comment) => (
          <div key={comment.id} className="mt-2 flex items-start gap-2 text-sm">
            <Link to={`/users/${comment.authorId}`} aria-label={`Open ${comment.author}'s profile`}>
              <Avatar name={comment.author} src={comment.avatarSrc} size={26} />
            </Link>
            <p className="min-w-0 flex-1 text-gray-700 dark:text-gray-200">
              <Link to={`/users/${comment.authorId}`} className="mr-1 font-semibold text-gray-900 hover:underline dark:text-white">{comment.author}</Link>
              {comment.text}
            </p>
          </div>
        ))}

        <form onSubmit={submitComment} className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/10">
          <Avatar name="You" size={28} />
          <input
            value={commentDraft}
            onChange={(event) => { setCommentDraft(event.target.value); setCommentError('') }}
            placeholder="Add a comment…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          <button type="submit" disabled={!commentDraft.trim()} aria-label="Post comment" className="text-primary disabled:opacity-40">
            <Send size={17} />
          </button>
        </form>
        {commentError && <p role="alert" className="mt-1 text-xs text-red-500">{commentError}</p>}

        {post.tag && (
          <span className="mt-2.5 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            #{post.tag}
          </span>
        )}

        {post.commentCount > 2 && (
          <button
            onClick={() => setCommentsOpen(true)}
            className="mt-2 block text-sm text-gray-400 hover:text-gray-500"
          >
            {t('view_all_comments', { n: post.commentCount })}
          </button>
        )}
      </div>

      <CommentsSheet post={post} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
      <ShareSheet post={post} open={shareOpen} onClose={() => setShareOpen(false)} />
    </article>
  )
}
