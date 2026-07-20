import { Link } from 'react-router-dom'
import { Clapperboard, Image as ImageIcon, PlaySquare, User, BookImage } from 'lucide-react'
import Avatar from '../ui/Avatar'

const KIND_META = {
  post: { icon: ImageIcon, label: 'Post' },
  reel: { icon: Clapperboard, label: 'Reel' },
  video: { icon: PlaySquare, label: 'Video' },
  story: { icon: BookImage, label: 'Story' },
  profile: { icon: User, label: 'Profile' },
}

export default function SharedContentBubble({ shared, mine }) {
  if (!shared) return null
  const meta = KIND_META[shared.kind] || KIND_META.post
  const Icon = meta.icon
  const linkTo = shared.kind === 'profile' ? `/users/${shared.id}` : shared.kind === 'video' ? '/videos' : '/'

  return (
    <Link
      to={linkTo}
      className={`tap-scale block w-56 overflow-hidden rounded-2xl border ${
        mine ? 'border-white/20 bg-white/10' : 'border-gray-100 dark:border-white/10 bg-white dark:bg-white/5'
      } shadow-card`}
    >
      {shared.image ? (
        <div className="relative h-32 w-full">
          <img src={shared.image} alt="" className="h-full w-full object-cover" />
          {(shared.kind === 'reel' || shared.kind === 'video' || shared.kind === 'story') && (
            <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white">
              <Icon size={12} />
            </span>
          )}
        </div>
      ) : (
        <div
          className="flex h-24 w-full items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${shared.color || '#4A90E2'}CC, ${shared.color || '#4A90E2'}55)` }}
        >
          {shared.kind === 'profile' ? (
            <Avatar name={shared.title} color={shared.color} size={48} />
          ) : (
            <Icon size={22} className="text-white" />
          )}
        </div>
      )}
      <div className="p-2.5">
        <p className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${mine ? 'text-white/70' : 'text-gray-400'}`}>
          <Icon size={11} /> {meta.label}
        </p>
        <p className={`mt-0.5 truncate text-xs font-semibold ${mine ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
          {shared.title}
        </p>
        {shared.subtitle && (
          <p className={`truncate text-[11px] ${mine ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{shared.subtitle}</p>
        )}
      </div>
    </Link>
  )
}
