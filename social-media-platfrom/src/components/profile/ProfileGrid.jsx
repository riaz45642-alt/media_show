import { useState } from 'react'
import { Heart, MessageCircle, X } from 'lucide-react'
import PostCard from '../cards/PostCard'

function GridTile({ post, onOpen }) {
  const thumb = post.media?.[0]
  return (
    <button
      onClick={() => onOpen(post)}
      className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-white/5"
    >
      {thumb ? (
        thumb.type === 'video' ? (
          <video src={thumb.src} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <img src={thumb.src} alt="" loading="lazy" className="h-full w-full object-cover" />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/5 p-2 text-center text-[11px] font-medium text-gray-500 dark:text-gray-300 line-clamp-4">
          {post.text}
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/30 group-hover:opacity-100">
        <span className="flex items-center gap-1 text-xs font-semibold text-white">
          <Heart size={14} className="fill-white" /> {post.likes}
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-white">
          <MessageCircle size={14} className="fill-white" /> {post.comments.length}
        </span>
      </div>
    </button>
  )
}

export default function ProfileGrid({ posts }) {
  const [openPost, setOpenPost] = useState(null)

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {posts.map((post) => (
          <GridTile key={post.id} post={post} onOpen={setOpenPost} />
        ))}
      </div>

      {openPost && (
        <div
          className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center overflow-y-auto bg-gray-900/50 backdrop-blur-sm p-0 sm:p-6 animate-fadeIn"
          onClick={() => setOpenPost(null)}
        >
          <div className="relative w-full sm:max-w-md animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpenPost(null)}
              className="tap-scale absolute -top-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white sm:-right-2 sm:-top-2"
            >
              <X size={18} />
            </button>
            <PostCard post={openPost} />
          </div>
        </div>
      )}
    </>
  )
}
