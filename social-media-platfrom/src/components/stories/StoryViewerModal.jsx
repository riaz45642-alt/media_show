import { useEffect, useState } from 'react'
import { X, Send } from 'lucide-react'
import Avatar from '../ui/Avatar'
import ShareSheet from '../feed/ShareSheet'

const DURATION = 5000

export default function StoryViewerModal({ users, activeIndex, onClose, onNext, onPrev }) {
  const [progress, setProgress] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const open = activeIndex !== null && activeIndex !== undefined
  const user = open ? users[activeIndex] : null

  useEffect(() => {
    if (!open || shareOpen) return
    setProgress(0)
    const start = Date.now()
    const tick = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / DURATION) * 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(tick)
        onNext()
      }
    }, 50)
    return () => clearInterval(tick)
  }, [open, activeIndex, onNext, shareOpen])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNext()
      if (e.key === 'ArrowLeft') onPrev()
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose, onNext, onPrev])

  if (!open || !user) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-0 sm:p-6">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden sm:h-[85vh] sm:rounded-3xl">
        {/* Story "content" — a themed gradient card since this is a mock feature */}
        <div
          className="flex flex-1 items-center justify-center text-center"
          style={{ background: `linear-gradient(160deg, ${user.color}, #111827)` }}
        >
          <div className="px-8 text-white">
            <Avatar name={user.name} src={user.avatar} size={84} ring />
            <p className="mt-4 font-display text-xl font-semibold">{user.name}</p>
            <p className="mt-1.5 text-sm text-white/80">Shared a moment from their day ✨</p>
          </div>
        </div>

        {/* Tap zones for prev/next */}
        <button aria-label="Previous story" onClick={onPrev} className="absolute inset-y-0 left-0 w-1/3" />
        <button aria-label="Next story" onClick={onNext} className="absolute inset-y-0 right-0 w-1/3" />

        <button
          onClick={() => setShareOpen(true)}
          aria-label="Send story"
          className="tap-scale absolute bottom-6 right-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
        >
          <Send size={19} />
        </button>

        {/* Progress bars */}
        <div className="absolute inset-x-3 top-3 flex gap-1.5">
          {users.map((u, i) => (
            <div key={u.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-[width] duration-75 ease-linear"
                style={{ width: i < activeIndex ? '100%' : i === activeIndex ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-4 top-7 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Avatar name={user.name} src={user.avatar} color={user.color} size={30} />
            <span className="text-sm font-semibold">{user.name}</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="tap-scale rounded-full p-1.5 text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>
      </div>

      <ShareSheet
        item={
          user
            ? { id: user.id, kind: 'story', title: user.name, subtitle: 'Shared a moment from their day ✨', image: null, color: user.color }
            : null
        }
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  )
}
