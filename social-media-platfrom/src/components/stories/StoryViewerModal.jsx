import { useEffect, useRef, useState } from 'react'
import { X, Send, Heart, Volume2, VolumeX } from 'lucide-react'
import Avatar from '../ui/Avatar'
import Portal from '../ui/Portal'
import ShareSheet from '../feed/ShareSheet'
import { useStories } from '../../context/StoriesContext'
import { useChat } from '../../context/ChatContext'
import { FOLLOWING } from '../../data/users'

const IMAGE_DURATION = 5000

export default function StoryViewerModal({ entries, activeId, onClose }) {
  const { getStories, markViewed, toggleLikeStory, setActiveEntryId } = useStories()
  const { findOrCreateConversation, sendMessage } = useChat()
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [reply, setReply] = useState('')
  const [sent, setSent] = useState(false)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef(null)

  const entryIndex = entries.findIndex((en) => en.id === activeId)
  const open = entryIndex !== -1
  const entry = open ? entries[entryIndex] : null
  const stories = entry ? getStories(entry.id) : []
  const story = stories[storyIndex] || null
  const duration = story?.type === 'video' ? null : IMAGE_DURATION

  // Reset to the first story whenever a different person's tray is opened.
  useEffect(() => { setStoryIndex(0) }, [activeId])

  useEffect(() => {
    if (story) markViewed(story.id)
  }, [story])

  // Videos must autoplay muted or mobile browsers silently block playback,
  // which used to leave the story stuck on a black frame. Force muted
  // playback on every story change, then let the user unmute if they want.
  useEffect(() => {
    if (story?.type !== 'video' || !videoRef.current) return
    const v = videoRef.current
    v.muted = muted
    v.currentTime = 0
    const playPromise = v.play()
    if (playPromise?.catch) {
      playPromise.catch(() => {
        v.muted = true
        setMuted(true)
        v.play().catch(() => {})
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id])

  const goToEntry = (dir) => {
    const next = entryIndex + dir
    if (next >= 0 && next < entries.length) {
      setStoryIndex(0)
      setProgress(0)
      setActiveEntryId(entries[next].id)
    } else {
      onClose()
    }
  }

  const nextStory = () => {
    if (storyIndex < stories.length - 1) {
      setStoryIndex((i) => i + 1)
      setProgress(0)
    } else {
      goToEntry(1)
    }
  }

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1)
      setProgress(0)
    } else {
      goToEntry(-1)
    }
  }

  useEffect(() => {
    if (!open || shareOpen || paused || !duration) return
    setProgress(0)
    const start = Date.now()
    const tick = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / duration) * 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(tick)
        nextStory()
      }
    }, 50)
    return () => clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storyIndex, activeId, shareOpen, paused, duration])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') nextStory()
      if (e.key === 'ArrowLeft') prevStory()
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, storyIndex, activeId])

  if (!open || !entry || !story) return null

  const handleSendReply = () => {
    if (!reply.trim() || entry.id === 'me') return
    const convo = findOrCreateConversation(entry.id)
    sendMessage(convo.id, { text: `Replied to your story: ${reply.trim()}` })
    setReply('')
    setSent(true)
    setTimeout(() => setSent(false), 1500)
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-0 sm:p-6">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-black sm:h-[85vh] sm:rounded-3xl">
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-900">
          {story.type === 'video' ? (
            <video
              ref={videoRef}
              src={story.src}
              className="h-full w-full object-contain"
              autoPlay
              muted={muted}
              playsInline
              onEnded={nextStory}
              onTimeUpdate={(e) => {
                const v = e.currentTarget
                if (v.duration) setProgress((v.currentTime / v.duration) * 100)
              }}
            />
          ) : (
            <img src={story.src} alt="" className="h-full w-full object-contain" />
          )}
          {story.type === 'video' && (
            <button
              onClick={(e) => { e.stopPropagation(); setMuted((m) => !m) }}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="tap-scale absolute top-16 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          )}
        </div>

        {/* Tap zones for prev/next */}
        <button aria-label="Previous story" onClick={prevStory} className="absolute inset-y-0 left-0 w-1/3" />
        <button
          aria-label="Pause"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          className="absolute inset-y-0 left-1/3 w-1/3"
        />
        <button aria-label="Next story" onClick={nextStory} className="absolute inset-y-0 right-0 w-1/3" />

        {/* Progress bars */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex gap-1.5">
          {stories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-[width] duration-75 ease-linear"
                style={{ width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-4 top-7 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Avatar name={entry.name} src={entry.avatar} color={entry.color} size={30} />
            <span className="text-sm font-semibold">{entry.id === 'me' ? 'Your story' : entry.name}</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="tap-scale pointer-events-auto rounded-full p-1.5 text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Like + reply bar */}
        <div className="absolute inset-x-3 bottom-4 flex items-center gap-2">
          {entry.id !== 'me' && (
            <>
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                placeholder={sent ? 'Sent!' : 'Reply...'}
                className="min-w-0 flex-1 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/60 backdrop-blur-sm outline-none focus:border-white/50"
              />
              <button
                onClick={() => toggleLikeStory(entry.id, story.id)}
                aria-label="Like story"
                className="tap-scale flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
              >
                <Heart size={19} className={story.likedByMe ? 'fill-red-500 text-red-500' : ''} />
              </button>
              <button
                onClick={() => (reply.trim() ? handleSendReply() : setShareOpen(true))}
                aria-label="Send"
                className="tap-scale flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
              >
                <Send size={18} />
              </button>
            </>
          )}
          {entry.id === 'me' && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs text-white/80 backdrop-blur-sm">
              <Heart size={14} className={story.likes > 0 ? 'fill-red-500 text-red-500' : ''} />
              {story.likes} {story.likes === 1 ? 'like' : 'likes'}
            </div>
          )}
        </div>
      </div>

      <ShareSheet
        item={
          entry
            ? {
                id: entry.id,
                kind: 'story',
                title: entry.name,
                subtitle: 'Shared a moment',
                image: story.type === 'image' ? story.src : null,
                color: entry.color,
                media: { type: story.type, src: story.src },
                // Private accounts' stories can only be re-shared to your own
                // story by their approved followers.
                shareToStoryDisabled: entry.id !== 'me' && entry.isPrivate && !FOLLOWING.some((u) => u.id === entry.id),
                shareToStoryDisabledReason: `${entry.name}'s story is private and can't be reshared`,
              }
            : null
        }
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
    </Portal>
  )
}
