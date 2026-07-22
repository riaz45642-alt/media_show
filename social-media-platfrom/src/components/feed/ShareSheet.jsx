import { useState } from 'react'
import { Link2, BookImage, Check, CheckCircle2, AlertCircle, Search } from 'lucide-react'
import Modal from '../ui/Modal'
import Avatar from '../ui/Avatar'
import { useLanguage } from '../../context/LanguageContext'
import { usePosts } from '../../context/PostsContext'
import { useChat } from '../../context/ChatContext'
import { useStories } from '../../context/StoriesContext'
import { USERS, FOLLOWERS, FOLLOWING } from '../../data/users'

// Modern, Instagram-style share sheet. Accepts a generic `item` describing
// the shareable content: { id, kind: 'post'|'reel'|'video'|'image'|'story'|'profile',
// title, subtitle, image, color, media: { type: 'image'|'video', src },
// shareToStoryDisabled, shareToStoryDisabledReason }. For backwards
// compatibility it also accepts the original `post` prop used by the feed.
export default function ShareSheet({ item, post, open, onClose }) {
  const { t } = useLanguage()
  const { incrementShare } = usePosts()
  const { conversations, shareContent } = useChat()
  const { addStory } = useStories()
  const [copied, setCopied] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [sent, setSent] = useState(false)
  const [storyShared, setStoryShared] = useState(false)
  const [shareError, setShareError] = useState(null)

  const content = item || (post ? {
    id: post.id,
    kind: post.media?.length > 0 ? 'post' : 'post',
    title: post.author,
    subtitle: post.text?.slice(0, 60) || 'Shared a post',
    image: post.media?.[0]?.src || null,
    color: post.avatarColor || '#4A90E2',
    media: post.media?.[0] ? { type: post.media[0].type, src: post.media[0].src } : null,
  } : null)

  if (!content) return null

  // Resolve the actual media that would be published to the story: prefer an
  // explicit `media` descriptor (needed for video reels/stories, since those
  // don't have a static `image` thumbnail), falling back to `image` for
  // simple image shares (posts, photos, profile avatars).
  const storyMedia = content.media || (content.image ? { type: 'image', src: content.image } : null)
  const canShareToStory = !!storyMedia?.src && !content.shareToStoryDisabled

  const recentIds = [...conversations]
    .filter((c) => !c.archived)
    .sort((a, b) => {
      const ta = a.messages[a.messages.length - 1]?.time || ''
      const tb = b.messages[b.messages.length - 1]?.time || ''
      return tb.localeCompare(ta)
    })
    .map((c) => c.participantId)

  const seen = new Set()
  const people = []
  ;[...recentIds, ...FOLLOWING.map((u) => u.id), ...FOLLOWERS.map((u) => u.id)].forEach((id) => {
    if (seen.has(id)) return
    const u = USERS.find((x) => x.id === id)
    if (!u) return
    seen.add(id)
    people.push(u)
  })
  const filteredPeople = query.trim()
    ? people.filter((u) => u.name.toLowerCase().includes(query.trim().toLowerCase()))
    : people

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const resetAndClose = () => {
    setSelected([])
    setQuery('')
    setSent(false)
    setCopied(false)
    setStoryShared(false)
    setShareError(null)
    onClose()
  }

  const handleSend = () => {
    if (selected.length === 0) return
    shareContent(selected, content)
    if (post) incrementShare(post.id)
    setSent(true)
    setTimeout(resetAndClose, 1200)
  }

  const handleQuickAction = async (kind) => {
    if (kind === 'copy') {
      if (post) incrementShare(post.id)
      try {
        await navigator.clipboard.writeText(`https://mediashow.app/${content.kind}/${content.id}`)
      } catch {
        /* clipboard may be unavailable in sandboxed preview — ignore */
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      return
    }

    if (kind === 'story') {
      if (!canShareToStory) {
        setShareError(content.shareToStoryDisabledReason || "This can't be shared to your story")
        setTimeout(() => setShareError(null), 2200)
        return
      }
      addStory({ type: storyMedia.type, src: storyMedia.src })
      if (post) incrementShare(post.id)
      setStoryShared(true)
      setTimeout(resetAndClose, 1200)
      return
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title={t('share_post') || 'Share'}>
      {sent || storyShared ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center animate-scaleIn">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/15 text-secondary-dark">
            <CheckCircle2 size={28} />
          </span>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {storyShared ? (t('added_to_story') || 'Added to your story!') : 'Sent!'}
          </p>
        </div>
      ) : (
        <>
          {shareError && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-500 animate-fadeIn">
              <AlertCircle size={15} className="shrink-0" />
              <span>{shareError}</span>
            </div>
          )}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickAction('copy')}
              className="tap-scale flex flex-col items-center gap-2 rounded-2xl border border-gray-100 dark:border-white/10 p-3.5 hover-lift"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                {copied ? <Check size={17} /> : <Link2 size={17} />}
              </span>
              <span className="text-center text-[11px] font-medium text-gray-600 dark:text-gray-300">
                {copied ? (t('link_copied') || 'Link copied!') : (t('copy_link') || 'Copy link')}
              </span>
            </button>
            <button
              onClick={() => handleQuickAction('story')}
              aria-disabled={!canShareToStory}
              className={`tap-scale flex flex-col items-center gap-2 rounded-2xl border border-gray-100 dark:border-white/10 p-3.5 ${
                canShareToStory ? 'hover-lift' : 'cursor-not-allowed opacity-40'
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BookImage size={17} />
              </span>
              <span className="text-center text-[11px] font-medium text-gray-600 dark:text-gray-300">
                {t('share_to_story') || 'Share to Story'}
              </span>
            </button>
          </div>

          <div className="relative mb-3">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people"
              className="focus-ring w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 py-2.5 pl-9 pr-3 text-sm outline-none"
            />
          </div>

          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {query.trim() ? 'Results' : 'Recent & Following'}
          </p>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {filteredPeople.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No people found</p>
            ) : (
              filteredPeople.map((u) => {
                const isSelected = selected.includes(u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className="tap-scale flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <div className="relative shrink-0">
                      <Avatar name={u.name} src={u.avatar} color={u.color} size={38} />
                      {u.isOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-secondary ring-2 ring-white dark:ring-[#161C2C]" />
                      )}
                    </div>
                    <span className="flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-200">{u.name}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300 dark:border-white/20'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {selected.length > 0 && (
            <button
              onClick={handleSend}
              className="btn-press tap-scale focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-white animate-slideUp"
            >
              {t('send_in_message') || 'Send'} ({selected.length})
            </button>
          )}
        </>
      )}
    </Modal>
  )
}
