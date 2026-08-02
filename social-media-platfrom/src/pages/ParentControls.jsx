import { useEffect, useState } from 'react'
import { Lock, Users, X } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Toggle from '../components/ui/Toggle'

export default function ParentControls() {
  const [messaging, setMessaging] = useState(true)
  const [passwordSet, setPasswordSet] = useState(false)
  const [password, setPassword] = useState('')
  const [pendingMessaging, setPendingMessaging] = useState(null)
  const [controlError, setControlError] = useState('')
  const [saving, setSaving] = useState(false)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mediashow_token')}` })

  useEffect(() => {
    fetch(`${apiUrl}/parent-controls`, { headers: headers() })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { setMessaging(data.messaging_enabled); setPasswordSet(data.parent_password_set) })
      .catch(() => setControlError('Unable to load parent controls.'))
  }, [apiUrl])

  const confirmMessagingChange = async (event) => {
    event.preventDefault()
    setSaving(true)
    setControlError('')
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
      setMessaging(data.messaging_enabled)
      setPendingMessaging(null)
      setPassword('')
    } catch (error) {
      setControlError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Parent Controls" subtitle="Secure controls that are enforced by the server." />
      <div className="soft-card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
          <Lock size={16} className="text-primary" /> Changes require the parent password.
        </div>
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users size={17} /></span>
          <div className="flex-1">
            <Toggle checked={messaging} onChange={(enabled) => { setPendingMessaging(enabled); setPassword(''); setControlError('') }} label="Allow Messaging" description="Controls new conversations and direct messages" />
          </div>
        </div>
        {controlError && pendingMessaging === null && <p className="mt-3 text-sm text-red-500">{controlError}</p>}
      </div>

      {pendingMessaging !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={confirmMessagingChange} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{passwordSet ? 'Confirm parent password' : 'Create parent password'}</h2>
              <button type="button" onClick={() => setPendingMessaging(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <p className="mt-2 text-sm text-gray-500">{passwordSet ? `Enter the parent password to ${pendingMessaging ? 'enable' : 'disable'} messaging.` : 'Create a password that only the parent or guardian knows (minimum 8 characters).'}</p>
            <input autoFocus required minLength={8} maxLength={128} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-4 w-full rounded-xl border border-gray-200 bg-transparent px-3 py-2" />
            {controlError && <p className="mt-2 text-sm text-red-500">{controlError}</p>}
            <button disabled={saving} className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Confirm'}</button>
          </form>
        </div>
      )}
    </div>
  )
}
