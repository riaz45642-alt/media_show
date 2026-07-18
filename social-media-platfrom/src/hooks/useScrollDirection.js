import { useEffect, useRef, useState } from 'react'

// Returns 'up' | 'down' and tracks whether we're near the top of the page.
export default function useScrollDirection({ threshold = 8 } = {}) {
  const [direction, setDirection] = useState('up')
  const [atTop, setAtTop] = useState(true)
  const lastY = useRef(0)

  useEffect(() => {
    lastY.current = window.scrollY
    let ticking = false

    const update = () => {
      const y = window.scrollY
      const diff = y - lastY.current
      setAtTop(y < 24)
      if (Math.abs(diff) > threshold) {
        setDirection(diff > 0 ? 'down' : 'up')
        lastY.current = y
      }
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return { direction, atTop }
}
