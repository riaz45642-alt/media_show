import { useState } from 'react'

function MediaItem({ item, className = '' }) {
  if (item.type === 'video') {
    return (
      <video
        src={item.src}
        controls
        playsInline
        preload="metadata"
        className={`h-full w-full object-cover bg-black ${className}`}
      />
    )
  }
  return <img src={item.src} alt="" className={`h-full w-full object-cover ${className}`} />
}

// Renders a single media item, or a swipeable carousel with dot indicators
// when a post has multiple media (mixed-media posts).
export default function PostMedia({ media = [], aspect = 'aspect-square', rounded = 'rounded-2xl' }) {
  const [index, setIndex] = useState(0)
  if (!media.length) return null

  if (media.length === 1) {
    return (
      <div className={`relative w-full overflow-hidden ${aspect} ${rounded}`}>
        <MediaItem item={media[0]} />
      </div>
    )
  }

  return (
    <div className={`relative w-full overflow-hidden ${aspect} ${rounded}`}>
      <div
        className="flex h-full w-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {media.map((item, i) => (
          <div key={i} className="h-full w-full shrink-0">
            <MediaItem item={item} />
          </div>
        ))}
      </div>

      {index > 0 && (
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="tap-scale absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white text-xs"
        >
          ‹
        </button>
      )}
      {index < media.length - 1 && (
        <button
          onClick={() => setIndex((i) => Math.min(media.length - 1, i + 1))}
          className="tap-scale absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white text-xs"
        >
          ›
        </button>
      )}

      <div className="absolute top-3 right-3 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white">
        {index + 1}/{media.length}
      </div>

      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {media.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
