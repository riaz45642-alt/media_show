import { useEffect, useState } from 'react'
import { Clock, Lock, Users, X } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Toggle from '../components/ui/Toggle'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mediashow_token')}` })

export default function ParentControls() {
  const [messaging, setMessaging] = useState(true)
  const [dailyLimit, setDailyLimit] = useState(60)
  const [selectedLimit, setSelectedLimit] = useState(60)
  const [passwordSet, setPasswordSet] = useState(false)
  const [pending, setPending] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/parent-controls`, { headers: authHeaders() })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        setMessaging(data.messaging_enabled)
        setDailyLimit(data.daily_screen_time_minutes)
        setSelectedLimit(data.daily_screen_time_minutes || 60)
        setPasswordSet(data.parent_password_set)
      })
      .catch(() => setError('Unable to load parent controls.'))
  }, [])

  const requestChange = (type, value) => { setPending({ type, value }); setPassword(''); setError('') }
  const confirmChange = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (!passwordSet) {
        const setup = await fetch(`${API_URL}/parent-controls/password`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ password }) })
        const setupData = await setup.json().catch(() => ({}))
        if (!setup.ok) throw new Error(setupData.message || 'Unable to create parent password.')
        setPasswordSet(true)
      }
      const isMessaging = pending.type === 'messaging'
      const response = await fetch(`${API_URL}/parent-controls/${isMessaging ? 'messaging' : 'daily-limit'}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify(isMessaging ? { enabled: pending.value, password } : { minutes: pending.value, password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Unable to update parent controls.')
      if (isMessaging) setMessaging(data.messaging_enabled)
      else setDailyLimit(data.daily_screen_time_minutes)
      setPending(null)
      setPassword('')
    } catch (requestError) { setError(requestError.message) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Parent Controls" subtitle="Secure controls that are enforced by the server." />
      <div className="soft-card space-y-5 p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300"><Lock size={16} className="text-primary" /> Changes require the parent password.</div>
        <div className="flex items-center gap-3.5 border-t border-gray-100 pt-5 dark:border-white/10">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users size={17} /></span>
          <div className="flex-1"><Toggle checked={messaging} onChange={(value) => requestChange('messaging', value)} label="Allow Messaging" description="Controls new conversations and direct messages" /></div>
        </div>
        <div className="border-t border-gray-100 pt-5 dark:border-white/10">
          <div className="mb-3 flex items-center gap-2 font-semibold"><Clock size={17} className="text-primary" /> Daily Screen Time</div>
          <div className="flex gap-2">
            <select value={selectedLimit} onChange={(event) => setSelectedLimit(Number(event.target.value))} className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-white/10">
              {[30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
            </select>
            <button onClick={() => requestChange('limit', selectedLimit)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Save</button>
            {dailyLimit && <button onClick={() => requestChange('limit', null)} className="rounded-xl border px-3 py-2 text-sm">Disable</button>}
          </div>
          <p className="mt-2 text-xs text-gray-400">Current limit: {dailyLimit ? `${dailyLimit} minutes per day` : 'No limit'}</p>
        </div>
        {error && !pending && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {pending && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={confirmChange} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="flex justify-between"><h2 className="font-semibold">{passwordSet ? 'Confirm parent password' : 'Create parent password'}</h2><button type="button" onClick={() => setPending(null)}><X size={18} /></button></div>
        <p className="mt-2 text-sm text-gray-500">Enter the parent password to confirm this change.</p>
        <input autoFocus required minLength={8} maxLength={128} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-4 w-full rounded-xl border bg-transparent px-3 py-2" />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <button disabled={saving} className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Confirm'}</button>
      </form></div>}
    </div>
  )
}
