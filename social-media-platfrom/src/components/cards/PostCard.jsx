import { Heart, MessageCircle, Share2, Flag } from 'lucide-react'
import { useState } from 'react'
import Avatar from '../ui/Avatar'
import SafeBadge from '../common/SafeBadge'
import { Link } from 'react-router-dom'

export default function PostCard({ post }) {
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(post.likes)

  const toggleLike = () => {
    setLiked((l) => !l)
    setLikes((n) => (liked ? n - 1 : n + 1))
  }

  return (
    <article className="soft-card p-4 sm:p-5 animate-slideUp">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={post.author} color={post.avatarColor} size={42} />
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{post.author}</p>
            <p className="text-xs text-gray-400">{post.time}</p>
          </div>
        </div>
        {post.safe && <SafeBadge />}
      </div>

      <p className="mt-3.5 text-[15px] leading-relaxed text-gray-700 dark:text-gray-200">{post.text}</p>

      {post.tag && (
        <span className="mt-3 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          #{post.tag}
        </span>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-white/10 pt-3">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} className="tap-scale flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Heart size={18} className={liked ? 'fill-red-500 text-red-500' : ''} />
            {likes}
          </button>
          <button className="tap-scale flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <MessageCircle size={18} />
            {post.comments}
          </button>
          <button className="tap-scale text-gray-500 dark:text-gray-400">
            <Share2 size={18} />
          </button>
        </div>
        <Link to="/reports" className="tap-scale text-gray-300 hover:text-red-400" title="Report content">
          <Flag size={16} />
        </Link>
      </div>
    </article>
  )
}
