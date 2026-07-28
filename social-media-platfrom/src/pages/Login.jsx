import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, continueWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async (action) => {
    setLoading(true)
    setError('')
    try {
      await action()
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="mb-7">
        <p className="auth-eyebrow">Welcome back</p>
        <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Log in to Media Show</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pick up where you left off.</p>
      </div>

      <button type="button" className="google-button" onClick={() => run(continueWithGoogle)} disabled={loading}>
        <span className="google-mark" aria-hidden="true">G</span> Continue with Google
      </button>
      <div className="auth-divider"><span>or use email</span></div>

      <form onSubmit={(e) => { e.preventDefault(); run(() => login(form)) }} className="space-y-4">
        <Input label="Email" icon={Mail} type="email" name="email" autoComplete="email" required placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" icon={Lock} type="password" name="password" autoComplete="current-password" required placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10">{error}</p>}
        <Button type="submit" fullWidth size="lg" disabled={loading}>{loading ? 'Signing in…' : 'Log in'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">New here? <Link to="/signup" className="font-semibold text-primary">Create an account</Link></p>
    </div>
  )
}
