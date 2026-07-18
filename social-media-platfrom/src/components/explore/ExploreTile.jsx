import { Heart, MessageCircle, PlayCircle } from 'lucide-react'

export default function ExploreTile({ item, onOpen }) {
  return (
    <button
      onClick={() => onOpen(item)}
      className={`group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-gray-100 dark:bg-white/5 shadow-card animate-scaleIn ${
        item.tall ? 'aspect-[3/4]' : 'aspect-square'
      }`}
    >
      {item.type === 'video' ? (
        <video
          src={item.src}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={item.src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      )}

      {item.type === 'video' && (
        <span className="absolute right-2.5 top-2.5 text-white drop-shadow">
          <PlayCircle size={20} fill="rgba(0,0,0,0.35)" />
        </span>
      )}

      {/* Hover / tap overlay with engagement stats — Instagram Explore style */}
      <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/30 group-hover:opacity-100">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Heart size={16} className="fill-white" /> {item.likes}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <MessageCircle size={16} className="fill-white" /> {item.comments}
        </span>
      </div>
    </button>
  )
}
