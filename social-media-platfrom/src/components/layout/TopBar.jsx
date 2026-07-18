import { Link } from 'react-router-dom'
import { Moon, Sun, ShieldCheck, Search } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../ui/Avatar'

export default function TopBar() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()

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
          <Link
            to="/explore"
            className="tap-scale hidden sm:flex h-9 w-9 items-center justify-center rounded-full hover:bg-primary/10 text-gray-500 dark:text-gray-300"
          >
            <Search size={18} />
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
    </header>
  )
}
