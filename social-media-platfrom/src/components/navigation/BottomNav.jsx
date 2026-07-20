import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Compass, PlusSquare, Clapperboard, MessageCircle } from 'lucide-react'
import useScrollDirection from '../../hooks/useScrollDirection'
import { useLanguage } from '../../context/LanguageContext'
import { useChat } from '../../context/ChatContext'
import CreatePostModal from '../feed/CreatePostModal'

export default function BottomNav() {
  const { direction, atTop } = useScrollDirection()
  const { t } = useLanguage()
  const { unreadCount } = useChat()
  const [createOpen, setCreateOpen] = useState(false)
  const visible = direction === 'up' || atTop

  // Profile already lives in the Top Navigation (avatar), so it isn't
  // repeated here — Reels takes its place instead.
  const ITEMS = [
    { to: '/', icon: Home, label: t('nav_home') },
    { to: '/explore', icon: Compass, label: t('nav_explore') },
    { key: 'create', icon: PlusSquare, label: 'Create', onClick: () => setCreateOpen(true) },
    { to: '/videos', icon: Clapperboard, label: 'Reels' },
    { to: '/messages', icon: MessageCircle, label: 'Chat', badge: unreadCount },
  ]

  return (
    <>
      {/* Full-width, centered wrapper: horizontal centering is handled by
          flex here (not by a transform), so the show/hide animation below
          can never knock the bar off-center or push it off-screen. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <nav
          className={`pointer-events-auto w-full max-w-sm transition-all duration-500 ease-out ${visible ? 'nav-visible' : 'nav-hidden'}`}
        >
          <div className="glass mx-auto flex w-full max-w-full items-center justify-between gap-0.5 overflow-x-auto rounded-full px-1.5 py-2 shadow-soft border border-white/40 scrollbar-none sm:justify-center sm:gap-1 sm:px-2">
            {ITEMS.map(({ to, icon: Icon, label, badge, key, onClick }) =>
              onClick ? (
                <button
                  key={key}
                  onClick={onClick}
                  className="tap-scale group relative flex shrink-0 flex-col items-center justify-center rounded-full px-2.5 py-2 text-gray-500 dark:text-gray-300 transition-all duration-300 hover:bg-primary/10 sm:px-4 sm:py-2.5"
                  aria-label={label}
                >
                  <Icon size={20} strokeWidth={2.3} />
                  <span className="mt-0.5 text-[10px] font-semibold tracking-wide hidden sm:block">{label}</span>
                </button>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `tap-scale group relative flex shrink-0 flex-col items-center justify-center rounded-full px-2.5 py-2 transition-all duration-300 sm:px-4 sm:py-2.5 ${
                      isActive ? 'bg-primary text-white shadow-soft' : 'text-gray-500 dark:text-gray-300 hover:bg-primary/10'
                    }`
                  }
                >
                  <span className="relative">
                    <Icon size={20} strokeWidth={2.3} />
                    {badge > 0 && (
                      <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 text-[10px] font-semibold tracking-wide hidden sm:block">{label}</span>
                </NavLink>
              )
            )}
          </div>
        </nav>
      </div>
      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
