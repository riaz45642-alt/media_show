import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Compass, PlusSquare, MessageCircle, User } from 'lucide-react'
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

  const ITEMS = [
    { to: '/', icon: Home, label: t('nav_home') },
    { to: '/explore', icon: Compass, label: t('nav_explore') },
    { key: 'create', icon: PlusSquare, label: 'Create', onClick: () => setCreateOpen(true) },
    { to: '/messages', icon: MessageCircle, label: 'Chat', badge: unreadCount },
    { to: '/profile', icon: User, label: t('nav_profile') },
  ]

  return (
    <>
      <nav
        className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ease-out ${visible ? 'nav-visible' : 'nav-hidden'}`}
      >
        <div className="glass flex items-center gap-1 rounded-full px-2 py-2 shadow-soft border border-white/40">
          {ITEMS.map(({ to, icon: Icon, label, badge, key, onClick }) =>
            onClick ? (
              <button
                key={key}
                onClick={onClick}
                className="tap-scale group relative flex flex-col items-center justify-center rounded-full px-4 py-2.5 text-gray-500 dark:text-gray-300 transition-all duration-300 hover:bg-primary/10"
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
                  `tap-scale group relative flex flex-col items-center justify-center rounded-full px-4 py-2.5 transition-all duration-300 ${
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
      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
