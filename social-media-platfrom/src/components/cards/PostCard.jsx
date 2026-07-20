import { useState } from 'react'
import { Heart, MessageCircle, Share2, Bookmark, Flag, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import SafeBadge from '../common/SafeBadge'
import ContentHealthBadge from '../common/ContentHealthBadge'
import PostMedia from '../feed/PostMedia'
import CommentsSheet from '../feed/CommentsSheet'
import ShareSheet from '../feed/ShareSheet'
import { usePosts } from '../../context/PostsContext'
import { useLanguage } from '../../context/LanguageContext'

export default function PostCard({ post }) {
  const { toggleLike, toggleSave } = usePosts()
  const { t } = useLanguage()
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)

  const doubleTapLike = () => {
    if (!post.likedByMe) toggleLike(post.id)
    setHeartBurst(true)
    setTimeout(() => setHeartBurst(false), 700)
  }

  return (
    <article className="soft-card overflow-hidden animate-slideUp">
      <div className="flex items-center justify-between p-4 sm:p-5 pb-3">
        <div className="flex items-center gap-3">
          <Avatar name={post.author} src={post.avatarSrc} color={post.avatarColor} size={42} />
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{post.author}</p>
            <p className="text-xs text-gray-400">{post.time}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {post.safe && <SafeBadge />}
          <ContentHealthBadge post={post} />
          <button className="tap-scale text-gray-300 hover:text-gray-500">
            <MoreHorizontal size={18} />
          </button>
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
        {post.media?.length === 0 && (
          <p className="mb-3.5 text-[15px] leading-relaxed text-gray-700 dark:text-gray-200">{post.text}</p>
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
              {post.comments.length}
            </button>
            <button onClick={() => setShareOpen(true)} className="tap-scale text-gray-500 dark:text-gray-400">
              <Share2 size={19} />
            </button>
          </div>
          <div className="flex items-center gap-2">
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
            <Link to="/reports" className="tap-scale text-gray-300 hover:text-red-400" title="Report content">
              <Flag size={16} />
            </Link>
          </div>
        </div>

        {post.media?.length > 0 && post.text && (
          <p className="mt-3 text-[15px] leading-relaxed text-gray-700 dark:text-gray-200">
            <span className="font-semibold text-gray-800 dark:text-gray-100">{post.author} </span>
            {post.text}
          </p>
        )}

        {post.tag && (
          <span className="mt-2.5 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            #{post.tag}
          </span>
        )}

        {post.comments.length > 0 && (
          <button
            onClick={() => setCommentsOpen(true)}
            className="mt-2 block text-sm text-gray-400 hover:text-gray-500"
          >
            {t('view_all_comments', { n: post.comments.length })}
          </button>
        )}
      </div>

      <CommentsSheet post={post} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
      <ShareSheet post={post} open={shareOpen} onClose={() => setShareOpen(false)} />
    </article>
  )
}
