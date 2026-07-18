import { Award, Heart, MessageCircle, ShieldCheck, Clock, Bell } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import { NOTIFICATIONS } from '../data/notifications'

const ICONS = {
  badge: { icon: Award, color: 'text-accent-dark bg-accent/15' },
  like: { icon: Heart, color: 'text-red-500 bg-red-50' },
  comment: { icon: MessageCircle, color: 'text-primary bg-primary/10' },
  system: { icon: ShieldCheck, color: 'text-secondary-dark bg-secondary/10' },
  reminder: { icon: Clock, color: 'text-gray-500 bg-gray-100' },
}

export default function Notifications() {
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Stay in the loop, gently." />
      {NOTIFICATIONS.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="No new notifications right now." />
      ) : (
        <div className="space-y-2.5">
          {NOTIFICATIONS.map((n) => {
            const { icon: Icon, color } = ICONS[n.type] || ICONS.system
            return (
              <div
                key={n.id}
                className={`soft-card flex items-center gap-3.5 p-4 animate-slideUp ${!n.read ? 'ring-2 ring-primary/15' : ''}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon size={17} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-200">{n.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                </div>
                {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
