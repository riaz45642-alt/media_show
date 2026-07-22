import { useEffect, useState } from 'react'
import { ShieldAlert, Check, X, RotateCcw, Ban, Scale } from 'lucide-react'

// Standalone admin moderation dashboard. Talks directly to the real backend
// (not the mock frontend auth/posts layer), since moderation decisions must
// be authoritative and audited server-side. Requires a user with role
// 'admin' in the `users` table (set manually: UPDATE users SET role='admin'
// WHERE email = '...').
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'mediashow_admin_token'

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`)
  return data
}

export default function AdminModeration() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '')
  const [creds, setCreds] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [tab, setTab] = useState('queue')
  const [status, setStatus] = useState('flagged')
  const [queue, setQueue] = useState({ posts: [], comments: [], users: [] })
  const [appealStatus, setAppealStatus] = useState('pending')
  const [appeals, setAppeals] = useState([])
  const [appealNotes, setAppealNotes] = useState({})
  const [loading, setLoading] = useState(false)

  const loadAppeals = async (authToken = token) => {
    setLoading(true)
    setError('')
    try {
      const data = await api(`/admin/appeals?status=${appealStatus}`, { token: authToken })
      setAppeals(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadQueue = async (authToken = token) => {
    setLoading(true)
    setError('')
    try {
      const data = await api(`/admin/moderation/queue?status=${status}`, { token: authToken })
      setQueue(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token && tab === 'queue') loadQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    if (token && tab === 'appeals') loadAppeals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appealStatus, tab])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = await api('/auth/login', { method: 'POST', body: creds })
      sessionStorage.setItem(TOKEN_KEY, data.token)
      setToken(data.token)
      loadQueue(data.token)
    } catch (err) {
      setError(err.message)
    }
  }

  const decide = async (type, id, action) => {
    try {
      await api(`/admin/moderation/${type}/${id}/decision`, { method: 'POST', token, body: { action } })
      loadQueue()
    } catch (err) {
      setError(err.message)
    }
  }

  const banUser = async (id) => {
    try {
      await api(`/admin/moderation/users/${id}/ban`, { method: 'POST', token })
      loadQueue()
    } catch (err) {
      setError(err.message)
    }
  }

  const decideAppeal = async (id, action) => {
    try {
      await api(`/admin/appeals/${id}/decision`, {
        method: 'POST',
        token,
        body: { action, note: appealNotes[id] || undefined },
      })
      loadAppeals()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto mt-16 max-w-sm rounded-2xl border p-6">
        <h1 className="mb-1 flex items-center gap-2 text-lg font-bold"><ShieldAlert size={20} /> Admin Login</h1>
        <p className="mb-4 text-sm text-neutral-500">Requires an account with role = 'admin'.</p>
        <form onSubmit={handleLogin} className="space-y-3">
          <input className="w-full rounded-lg border px-3 py-2" placeholder="Email" type="email"
            value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} />
          <input className="w-full rounded-lg border px-3 py-2" placeholder="Password" type="password"
            value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} />
          <button className="w-full rounded-lg bg-primary py-2 font-semibold text-white" type="submit">Sign in</button>
        </form>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  const rows = [
    ...queue.posts.map((p) => ({ ...p, type: 'post', preview: p.text_content })),
    ...queue.comments.map((c) => ({ ...c, type: 'comment', preview: c.text_content })),
    ...queue.users.map((u) => ({ ...u, type: 'user', preview: `${u.name} <${u.email}>` })),
  ]

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><ShieldAlert size={22} /> Moderation Dashboard</h1>

      <div className="mb-4 flex gap-2 border-b dark:border-neutral-800">
        {[
          { key: 'queue', label: 'Queue' },
          { key: 'appeals', label: 'Appeals' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-neutral-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-neutral-500">Loading…</p>}

      {tab === 'queue' && (
        <>
          <div className="mb-4 flex gap-2">
            {['flagged', 'safe', 'rejected'].map((s) => (
              <button key={s} onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${status === s ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {rows.length === 0 && !loading && <p className="text-sm text-neutral-500">Nothing in this queue.</p>}
            {rows.map((row) => (
              <div key={`${row.type}-${row.id}`} className="rounded-xl border p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                  <span className="uppercase tracking-wide">{row.type}</span>
                  <span>Risk: {row.risk_score ?? 0}</span>
                </div>
                <p className="mb-1 text-sm">{row.preview}</p>
                {row.moderation_reason && <p className="mb-2 text-xs text-amber-600">Reason: {row.moderation_reason}</p>}
                <div className="flex gap-2">
                  {row.type !== 'user' && (
                    <>
                      <button onClick={() => decide(row.type, row.id, 'approve')} className="flex items-center gap-1 rounded-lg bg-secondary/10 px-2 py-1 text-xs font-medium text-secondary-dark">
                        <Check size={14} /> Approve
                      </button>
                      <button onClick={() => decide(row.type, row.id, 'reject')} className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
                        <X size={14} /> Reject
                      </button>
                      <button onClick={() => decide(row.type, row.id, 'restore')} className="flex items-center gap-1 rounded-lg bg-neutral-100 px-2 py-1 text-xs font-medium dark:bg-neutral-800">
                        <RotateCcw size={14} /> Restore
                      </button>
                    </>
                  )}
                  {row.type === 'user' && (
                    <button onClick={() => banUser(row.id)} className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
                      <Ban size={14} /> Ban user
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'appeals' && (
        <>
          <div className="mb-4 flex gap-2">
            {['pending', 'approved', 'rejected', 'all'].map((s) => (
              <button key={s} onClick={() => setAppealStatus(s)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${appealStatus === s ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {appeals.length === 0 && !loading && <p className="text-sm text-neutral-500">No appeals here.</p>}
            {appeals.map((a) => (
              <div key={a.id} className="rounded-xl border p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                  <span className="flex items-center gap-1 uppercase tracking-wide"><Scale size={12} /> {a.content_type}</span>
                  <span>{a.user_name} &lt;{a.user_email}&gt;</span>
                </div>
                <p className="mb-1 text-xs text-neutral-500">
                  Original status: <strong>{a.original_status}</strong> · AI risk score: {a.risk_score ?? 0}
                </p>
                {a.ai_reason && <p className="mb-2 text-xs text-amber-600">AI reason: {a.ai_reason}</p>}
                <p className="mb-2 text-sm">User explanation: {a.explanation}</p>
                {a.moderator_note && <p className="mb-2 text-xs text-neutral-500">Note on file: {a.moderator_note}</p>}

                {a.status === 'pending' ? (
                  <div className="space-y-2">
                    <input
                      className="w-full rounded-lg border px-2 py-1 text-xs"
                      placeholder="Optional note to the user…"
                      value={appealNotes[a.id] || ''}
                      onChange={(e) => setAppealNotes({ ...appealNotes, [a.id]: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => decideAppeal(a.id, 'approve')} className="flex items-center gap-1 rounded-lg bg-secondary/10 px-2 py-1 text-xs font-medium text-secondary-dark">
                        <Check size={14} /> Approve & Restore
                      </button>
                      <button onClick={() => decideAppeal(a.id, 'reject')} className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${a.status === 'approved' ? 'bg-secondary/10 text-secondary-dark' : 'bg-red-100 text-red-600'}`}>
                    {a.status === 'approved' ? <Check size={12} /> : <X size={12} />} {a.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
