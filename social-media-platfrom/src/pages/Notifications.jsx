import { useMemo, useState } from 'react'
import {
  Award, Heart, MessageCircle, ShieldCheck, Clock, Bell, AtSign,
  UserPlus, Mail, Gavel, Flag, Lock, CheckCheck, Search, SlidersHorizontal, Scale, X,
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import { NOTIFICATION_CATEGORIES, NOTIFICATION_PREFERENCES } from '../data/notifications'
import { useNotifications } from '../context/NotificationsContext'
import Avatar from '../components/ui/Avatar'

const ICONS = {
  badge: { icon: Award, color: 'text-accent-dark bg-accent/15' },
  like: { icon: Heart, color: 'text-red-500 bg-red-50' },
  comment: { icon: MessageCircle, color: 'text-primary bg-primary/10' },
  system: { icon: ShieldCheck, color: 'text-secondary-dark bg-secondary/10' },
  reminder: { icon: Clock, color: 'text-gray-500 bg-gray-100' },
  mention: { icon: AtSign, color: 'text-primary bg-primary/10' },
  follower: { icon: UserPlus, color: 'text-secondary-dark bg-secondary/10' },
  follow: { icon: UserPlus, color: 'text-secondary-dark bg-secondary/10' },
  friend_request: { icon: UserPlus, color: 'text-secondary-dark bg-secondary/10' },
  message: { icon: Mail, color: 'text-primary bg-primary/10' },
  moderation: { icon: Gavel, color: 'text-amber-600 bg-amber-50' },
  appeal: { icon: Scale, color: 'text-primary bg-primary/10' },
  report: { icon: Flag, color: 'text-red-500 bg-red-50' },
  security: { icon: Lock, color: 'text-gray-600 bg-gray-100' },
}

export default function Notifications() {
  const { items, unreadCount, markAllRead, markRead, dismissNotification, acceptFollowRequest, notificationPermission, enableBrowserNotifications, preferences, updatePreference } = useNotifications()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [showPrefs, setShowPrefs] = useState(false)
  const filtered = useMemo(() => {
    let list = filter === 'all' ? items : items.filter((n) => n.category === filter)
    if (query.trim()) list = list.filter((n) => n.text.toLowerCase().includes(query.trim().toLowerCase()))
    return list
  }, [items, filter, query])
  const unreadByCategory = useMemo(() => items.reduce((counts, item) => {
    if (!item.read) counts[item.category] = (counts[item.category] || 0) + 1
    return counts
  }, {}), [items])

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'Stay in the loop, gently.'}
        />
        <div className="mt-1.5 flex shrink-0 items-center gap-2">
          {notificationPermission === 'default' && (
            <button onClick={enableBrowserNotifications} className="tap-scale rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">
              Enable browser alerts
            </button>
          )}
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="tap-scale flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          <button
            onClick={() => setShowPrefs((s) => !s)}
            className="tap-scale flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-white/5 text-gray-500 shadow-card"
            aria-label="Notification preferences"
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notifications"
          className="focus-ring w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 py-2.5 pl-9 pr-3 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 outline-none"
        />
      </div>

      {showPrefs && (
        <div className="soft-card mb-4 p-4 animate-scaleIn">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Notification Preferences</p>
          <div className="space-y-2.5">
            {NOTIFICATION_PREFERENCES.map((c) => (
              <label key={c.key} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                {c.label}
                <input
                  type="checkbox"
                  checked={preferences[c.key] !== false}
                  onChange={(event) => updatePreference(c.key, event.target.checked).catch(() => {})}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
          </div>
        </div>
      )}

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
            {c.label}{(c.key === 'all' ? unreadCount : unreadByCategory[c.key]) > 0 ? ` (${c.key === 'all' ? unreadCount : unreadByCategory[c.key]})` : ''}
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
              <div
                key={n.id}
                className={`soft-card flex w-full items-center gap-3.5 p-4 text-left animate-slideUp ${!n.read ? 'ring-2 ring-primary/15' : ''}`}
              >
                {n.actor_avatar_url
                  ? <Avatar name={n.actor_name || 'Member'} src={n.actor_avatar_url} size={40} />
                  : <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={17} /></span>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-200">{n.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  {n.kind === 'friend_request' && n.entity_type === 'follow_request' && n.followRequestStatus === 'pending' && (
                    <button onClick={() => acceptFollowRequest(n.entity_id, n.id)} className="mt-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">Accept</button>
                  )}
                  {n.kind === 'friend_request' && n.followRequestStatus === 'accepted' && (
                    <p className="mt-1 text-xs font-semibold text-secondary-dark">Accepted</p>
                  )}
                </div>
                {!n.read && <button aria-label="Mark read" onClick={() => markRead(n.id)} className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                <button aria-label="Dismiss notification" onClick={() => dismissNotification(n.id).catch(() => {})} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10"><X size={15} /></button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
