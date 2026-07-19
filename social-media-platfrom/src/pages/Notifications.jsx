import { useMemo, useState } from 'react'
import {
  Award, Heart, MessageCircle, ShieldCheck, Clock, Bell, AtSign,
  UserPlus, Mail, Gavel, Flag, Lock, CheckCheck,
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import { NOTIFICATIONS, NOTIFICATION_CATEGORIES } from '../data/notifications'

const ICONS = {
  badge: { icon: Award, color: 'text-accent-dark bg-accent/15' },
  like: { icon: Heart, color: 'text-red-500 bg-red-50' },
  comment: { icon: MessageCircle, color: 'text-primary bg-primary/10' },
  system: { icon: ShieldCheck, color: 'text-secondary-dark bg-secondary/10' },
  reminder: { icon: Clock, color: 'text-gray-500 bg-gray-100' },
  mention: { icon: AtSign, color: 'text-primary bg-primary/10' },
  follower: { icon: UserPlus, color: 'text-secondary-dark bg-secondary/10' },
  message: { icon: Mail, color: 'text-primary bg-primary/10' },
  moderation: { icon: Gavel, color: 'text-amber-600 bg-amber-50' },
  report: { icon: Flag, color: 'text-red-500 bg-red-50' },
  security: { icon: Lock, color: 'text-gray-600 bg-gray-100' },
}

export default function Notifications() {
  const [items, setItems] = useState(NOTIFICATIONS)
  const [filter, setFilter] = useState('all')

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])
  const filtered = filter === 'all' ? items : items.filter((n) => n.category === filter)

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  const markRead = (id) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'Stay in the loop, gently.'}
        />
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="tap-scale mt-1.5 flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {NOTIFICATION_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === c.key
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-white/5 text-gray-500 dark:text-gray-300 shadow-card'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="No notifications in this category." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((n) => {
            const { icon: Icon, color } = ICONS[n.type] || ICONS.system
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`soft-card flex w-full items-center gap-3.5 p-4 text-left animate-slideUp ${!n.read ? 'ring-2 ring-primary/15' : ''}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon size={17} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-200">{n.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                </div>
                {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
