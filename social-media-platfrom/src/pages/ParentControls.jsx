import { useEffect, useState } from 'react'
import { Users, Clock, TrendingUp, Lock, X } from 'lucide-react'
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
  const [dailyLimit, setDailyLimit] = useState(true)
  const [passwordSet, setPasswordSet] = useState(false)
  const [password, setPassword] = useState('')
  const [pendingMessaging, setPendingMessaging] = useState(null)
  const [controlError, setControlError] = useState('')
  const [saving, setSaving] = useState(false)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mediashow_token')}` })

  useEffect(() => {
    fetch(`${apiUrl}/parent-controls`, { headers: headers() }).then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { setMessaging(data.messaging_enabled); setPasswordSet(data.parent_password_set) }).catch(() => setControlError('Unable to load parent controls.'))
  }, [apiUrl])

  const requestMessagingChange = (enabled) => { setPendingMessaging(enabled); setPassword(''); setControlError('') }
  const confirmMessagingChange = async (event) => {
    event.preventDefault(); setSaving(true); setControlError('')
    try {
      if (!passwordSet) {
        const setup = await fetch(`${apiUrl}/parent-controls/password`, { method: 'POST', headers: headers(), body: JSON.stringify({ password }) })
        const setupData = await setup.json().catch(() => ({}))
        if (!setup.ok) throw new Error(setupData.message || 'Unable to create parent password.')
        setPasswordSet(true)
      }
      const response = await fetch(`${apiUrl}/parent-controls/messaging`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ enabled: pendingMessaging, password }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Unable to update messaging.')
      setMessaging(data.messaging_enabled); setPendingMessaging(null); setPassword('')
    } catch (error) { setControlError(error.message) } finally { setSaving(false) }
  }

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
            <Toggle checked={messaging} onChange={requestMessagingChange} label="Allow Messaging" description="Protected by the parent password" />
          </div>
        </div>
      </div>
      {pendingMessaging !== null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={confirmMessagingChange} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between"><h2 className="font-semibold">{passwordSet ? 'Confirm parent password' : 'Create parent password'}</h2><button type="button" onClick={() => setPendingMessaging(null)} aria-label="Close"><X size={18} /></button></div>
        <p className="mt-2 text-sm text-gray-500">{passwordSet ? `Enter the parent password to ${pendingMessaging ? 'enable' : 'disable'} messaging.` : 'Create a password that only the parent or guardian knows (minimum 8 characters).'}</p>
        <input autoFocus required minLength={8} maxLength={128} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-4 w-full rounded-xl border border-gray-200 bg-transparent px-3 py-2" />
        {controlError && <p className="mt-2 text-sm text-red-500">{controlError}</p>}
        <button disabled={saving} className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Confirm'}</button>
      </form></div>}
    </div>
  )
}
