import { useState } from 'react'
import { Users, Clock, ShieldAlert, TrendingUp, Lock } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Toggle from '../components/ui/Toggle'
import { AGE_TIERS, AGE_GROUP_LABEL, AGE_GROUP_DESC } from '../utils/ageGroup'

const WEEKLY = [
  { day: 'Mon', minutes: 32 },
  { day: 'Tue', minutes: 48 },
  { day: 'Wed', minutes: 20 },
  { day: 'Thu', minutes: 55 },
  { day: 'Fri', minutes: 40 },
  { day: 'Sat', minutes: 65 },
  { day: 'Sun', minutes: 25 },
]

export default function ParentControls() {
  const [filterLevel, setFilterLevel] = useState(AGE_TIERS.TEEN)
  const [messaging, setMessaging] = useState(true)
  const [locationSharing, setLocationSharing] = useState(false)
  const [dailyLimit, setDailyLimit] = useState(true)

  const max = Math.max(...WEEKLY.map((d) => d.minutes))

  return (
    <div>
      <PageHeader title="Parent Controls" subtitle="A family dashboard for peace of mind." />

      <div className="soft-card p-5 mb-5">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-1.5">
          <TrendingUp size={15} className="text-primary" /> Weekly Growth Summary
        </p>
        <div className="flex items-end justify-between gap-2 h-28">
          {WEEKLY.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-lg gradient-brand animate-slideUp"
                style={{ height: `${(d.minutes / max) * 100}%`, minHeight: 6 }}
              />
              <span className="text-[10px] text-gray-400">{d.day}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Average 40 min/day — 12% calmer engagement than last week.
        </p>
      </div>

      <div className="soft-card p-5 mb-5">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-1.5">
          <Lock size={15} className="text-primary" /> Content Filtering Level
        </p>
        <div className="space-y-2">
          {Object.values(AGE_TIERS).map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterLevel(tier)}
              className={`tap-scale w-full text-left rounded-2xl border p-3.5 transition-colors duration-300 ${
                filterLevel === tier ? 'border-primary/40 bg-primary/10' : 'border-gray-100 dark:border-white/10'
              }`}
            >
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{AGE_GROUP_LABEL[tier]}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{AGE_GROUP_DESC[tier]}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="soft-card divide-y divide-gray-100 dark:divide-white/10 mb-5">
        <div className="flex items-center gap-3.5 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary-dark">
            <Clock size={17} />
          </span>
          <div className="flex-1">
            <Toggle checked={dailyLimit} onChange={setDailyLimit} label="Daily Time Limit" description="Cap usage at 60 minutes/day" />
          </div>
        </div>
        <div className="flex items-center gap-3.5 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users size={17} />
          </span>
          <div className="flex-1">
            <Toggle checked={messaging} onChange={setMessaging} label="Allow Messaging" description="Chat with approved friends only" />
          </div>
        </div>
        <div className="flex items-center gap-3.5 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-dark">
            <ShieldAlert size={17} />
          </span>
          <div className="flex-1">
            <Toggle checked={locationSharing} onChange={setLocationSharing} label="Location Sharing" description="Off by default for safety" />
          </div>
        </div>
      </div>
    </div>
  )
}
