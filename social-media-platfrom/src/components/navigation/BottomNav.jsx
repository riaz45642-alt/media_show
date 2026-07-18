import { NavLink } from 'react-router-dom'
import { Home, Compass, PlaySquare, Bell, User } from 'lucide-react'
import useScrollDirection from '../../hooks/useScrollDirection'

const ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/videos', icon: PlaySquare, label: 'Videos' },
  { to: '/notifications', icon: Bell, label: 'Alerts' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const { direction, atTop } = useScrollDirection()
  const visible = direction === 'up' || atTop

  return (
    <nav
      className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ease-out ${visible ? 'nav-visible' : 'nav-hidden'}`}
    >
      <div className="glass flex items-center gap-1 rounded-full px-2 py-2 shadow-soft border border-white/40">
        {ITEMS.map(({ to, icon: Icon, label }) => (
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
            <Icon size={20} strokeWidth={2.3} />
            <span className="mt-0.5 text-[10px] font-semibold tracking-wide hidden sm:block">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
