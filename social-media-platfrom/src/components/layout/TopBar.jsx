import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun, ShieldCheck, Search, Bell, Clapperboard } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationsContext'
import Avatar from '../ui/Avatar'
import SearchOverlay from '../search/SearchOverlay'

export default function TopBar() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const { unreadCount } = useNotifications()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/40 dark:border-white/5">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-white shadow-soft">
            <ShieldCheck size={18} />
          </span>
          <span className="font-display font-bold text-gray-800 dark:text-gray-100 text-lg">SafeZone</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-full hover:bg-primary/10 text-gray-500 dark:text-gray-300"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
          <Link
            to="/videos"
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-full hover:bg-primary/10 text-gray-500 dark:text-gray-300"
            aria-label="Reels"
            title="Reels"
          >
            <Clapperboard size={18} />
          </Link>
          <Link
            to="/notifications"
            className="tap-scale relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-primary/10 text-gray-500 dark:text-gray-300"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#141a2a]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <button
            onClick={toggleTheme}
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-full hover:bg-primary/10 text-gray-500 dark:text-gray-300"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/profile">
            <Avatar name={user?.name || 'You'} src={user?.avatar} size={34} />
          </Link>
        </div>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
