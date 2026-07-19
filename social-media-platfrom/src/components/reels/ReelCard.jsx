import { useEffect, useRef, useState } from 'react'
import { Heart, MessageCircle, Send, Bookmark, Volume2, VolumeX, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import ReelCommentsSheet from './ReelCommentsSheet'
import ShareSheet from '../feed/ShareSheet'

export default function ReelCard({ reel, active, muted, onToggleMute }) {
  const videoRef = useRef(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(reel.likes)
  const [saved, setSaved] = useState(false)
  const [following, setFollowing] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  const [comments, setComments] = useState(reel.comments)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (active) {
      el.currentTime = 0
      el.play().catch(() => {})
      setPaused(false)
    } else {
      el.pause()
    }
  }, [active])

  const toggleLike = () => {
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1))
      return !prev
    })
  }

  const togglePlay = () => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      el.play().catch(() => {})
      setPaused(false)
    } else {
      el.pause()
      setPaused(true)
    }
  }

  return (
    <div className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={reel.src}
        loop
        muted={muted}
        playsInline
        onClick={togglePlay}
        className="h-full w-full object-cover"
      />

      {paused && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
        >
          <Play size={28} className="ml-1" fill="currentColor" />
        </button>
      )}

      {/* Gradient scrims for legible overlay text */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 to-transparent" />

      <button
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="tap-scale absolute right-4 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      {/* Caption + author */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 pb-6">
        <div className="min-w-0 flex-1 text-white">
          <div className="flex items-center gap-2.5">
            <Link to="/profile">
              <Avatar name={reel.author.name} src={reel.author.avatar} color={reel.author.color} size={38} />
            </Link>
            <Link to="/profile" className="text-sm font-semibold">
              {reel.author.name}
            </Link>
            <button
              onClick={() => setFollowing((f) => !f)}
              className={`tap-scale rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                following ? 'bg-white/20 text-white' : 'bg-white text-gray-900'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          </div>
          <p className="mt-2.5 line-clamp-2 text-sm leading-snug">{reel.caption}</p>
          {reel.tag && (
            <span className="mt-2 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-sm">
              #{reel.tag}
            </span>
          )}
        </div>

        {/* Action rail */}
        <div className="flex shrink-0 flex-col items-center gap-4 text-white">
          <button onClick={toggleLike} className="tap-scale flex flex-col items-center gap-1">
            <Heart size={26} className={liked ? 'fill-red-500 text-red-500' : ''} />
            <span className="text-[11px] font-semibold">{likeCount}</span>
          </button>
          <button onClick={() => setCommentsOpen(true)} className="tap-scale flex flex-col items-center gap-1">
            <MessageCircle size={26} />
            <span className="text-[11px] font-semibold">{comments.length}</span>
          </button>
          <button onClick={() => setShareOpen(true)} className="tap-scale flex flex-col items-center gap-1">
            <Send size={24} />
            <span className="text-[11px] font-semibold">Share</span>
          </button>
          <button onClick={() => setSaved((s) => !s)} className="tap-scale flex flex-col items-center gap-1">
            <Bookmark size={24} className={saved ? 'fill-accent text-accent' : ''} />
          </button>
        </div>
      </div>

      <ReelCommentsSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        comments={comments}
        onAdd={(text) => setComments((prev) => [...prev, { id: `rc-${Date.now()}`, author: 'You', text }])}
      />
      <ShareSheet post={{ id: reel.id, author: reel.author.name }} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  )
}
