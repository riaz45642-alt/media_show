import { useEffect, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import ReelCard from '../components/reels/ReelCard'
import { REELS } from '../data/reels'

export default function Videos() {
  const containerRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let raf = null
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        const idx = Math.round(el.scrollTop / el.clientHeight)
        setActiveIndex((prev) => (prev === idx ? prev : idx))
        raf = null
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed inset-0 z-30 bg-black">
      <Link
        to="/"
        aria-label="Back"
        className="tap-scale absolute left-4 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
      >
        <ChevronLeft size={20} />
      </Link>

      <div
        ref={containerRef}
        className="scrollbar-none h-full w-full snap-y snap-mandatory overflow-y-scroll scroll-smooth"
        
      >
        {REELS.map((reel, i) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            active={i === activeIndex}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
          />
        ))}
      </div>
    </div>
  )
}
