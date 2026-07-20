import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MoreHorizontal, Link2, Bookmark, VolumeX, Volume2, UserX, UserCheck, Pencil, Trash2, Flag,
} from 'lucide-react'
import { usePosts } from '../../context/PostsContext'

export default function PostMenu({ post, onEdit }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const { toggleSave, deletePost, mutedAuthors, blockedAuthors, toggleMuteAuthor, toggleBlockAuthor } = usePosts()

  const isMuted = mutedAuthors.includes(post.author)
  const isBlocked = blockedAuthors.includes(post.author)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }

  const item = (icon, label, onClick, danger = false) => (
    <button
      onClick={() => { onClick(); setOpen(false) }}
      className={`tap-scale flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/10 ${
        danger ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'
      }`}
    >
      {icon} {label}
    </button>
  )

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="tap-scale text-gray-300 hover:text-gray-500"
        aria-label="Post options"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="soft-card absolute right-0 top-8 z-30 w-48 overflow-hidden p-1.5 shadow-soft animate-scaleIn">
          {item(<Link2 size={15} />, copied ? 'Copied!' : 'Copy link', copyLink)}
          {item(<Bookmark size={15} />, post.saved ? 'Unsave' : 'Save', () => toggleSave(post.id))}

          {post.own ? (
            <>
              {item(<Pencil size={15} />, 'Edit', onEdit)}
              {item(<Trash2 size={15} />, 'Delete', () => deletePost(post.id), true)}
            </>
          ) : (
            <>
              {item(isMuted ? <Volume2 size={15} /> : <VolumeX size={15} />, isMuted ? 'Unmute' : 'Mute', () => toggleMuteAuthor(post.author))}
              {item(isBlocked ? <UserCheck size={15} /> : <UserX size={15} />, isBlocked ? 'Unblock' : 'Block', () => toggleBlockAuthor(post.author), true)}
              {item(<Flag size={15} />, 'Report', () => navigate('/reports'), true)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
