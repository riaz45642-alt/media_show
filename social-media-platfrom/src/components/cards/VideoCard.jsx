import { Play, Clock } from 'lucide-react'

export default function VideoCard({ video }) {
  return (
    <div className="soft-card overflow-hidden cursor-pointer hover-lift animate-scaleIn">
      <div
        className="relative flex h-36 items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${video.color}CC, ${video.color}55)` }}
      >
        <span className="tap-scale flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-soft">
          <Play size={20} className="ml-0.5 text-gray-800" fill="currentColor" />
        </span>
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
          <Clock size={11} /> {video.duration}
        </span>
      </div>
      <div className="p-3.5">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-2">{video.title}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">{video.creator}</p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{video.tag}</span>
        </div>
      </div>
    </div>
  )
}
