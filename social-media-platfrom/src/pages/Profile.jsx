import { Link } from 'react-router-dom'
import { Settings as SettingsIcon, Edit3, Award, Gauge, LogOut } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { getAgeGroup, AGE_GROUP_LABEL } from '../utils/ageGroup'

export default function Profile() {
  const { user, logout } = useAuth()
  const ageGroup = user ? getAgeGroup(user.age) : null
  const score = user?.safeZoneScore ?? 82

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-gray-100">Profile</h1>
        <Link to="/settings" className="tap-scale flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-white/5 shadow-card">
          <SettingsIcon size={18} className="text-gray-500" />
        </Link>
      </div>

      <div className="soft-card p-6 text-center animate-scaleIn">
        <div className="flex justify-center">
          <Avatar name={user?.name || 'You'} src={user?.avatar} size={84} ring />
        </div>
        <h2 className="mt-3 font-display text-lg font-bold text-gray-800 dark:text-gray-100">{user?.name || 'Explorer'}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
        {ageGroup && (
          <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {AGE_GROUP_LABEL[ageGroup]}
          </span>
        )}

        <Link to="/profile/edit">
          <Button variant="outline" size="sm" className="mt-4">
            <Edit3 size={14} /> Edit Profile
          </Button>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3.5">
        <div className="soft-card p-4 text-center">
          <Gauge size={20} className="mx-auto text-secondary" />
          <p className="mt-2 text-xl font-bold text-gray-800 dark:text-gray-100">{score}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Safe Zone Score</p>
        </div>
        <div className="soft-card p-4 text-center">
          <Award size={20} className="mx-auto text-accent-dark" />
          <p className="mt-2 text-xl font-bold text-gray-800 dark:text-gray-100">{user?.badges?.length ?? 3}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Badges Earned</p>
        </div>
      </div>

      <div className="mt-5 soft-card p-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Your Badges</p>
        <div className="flex flex-wrap gap-2">
          {(user?.badges?.length ? user.badges : ['Newcomer', 'Kind Heart', 'Curious Mind']).map((b) => (
            <span key={b} className="rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent-dark">
              🏅 {b}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Link to="/safe-center" className="soft-card flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover-lift">
          Safe Center
        </Link>
        <Link to="/parent-controls" className="soft-card flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover-lift">
          Parent Controls
        </Link>
        <Link to="/about" className="soft-card flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover-lift">
          About SafeZone
        </Link>
        <button
          onClick={logout}
          className="tap-scale w-full flex items-center gap-2 justify-center rounded-2xl border border-red-100 dark:border-red-900/40 p-4 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </div>
  )
}
