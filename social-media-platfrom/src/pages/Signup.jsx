import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Cake, ShieldCheck } from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { getAgeGroup, AGE_GROUP_LABEL, AGE_GROUP_DESC } from '../utils/ageGroup'

export default function Signup() {
  const { signup, continueWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', age: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ageGroup = form.age ? getAgeGroup(form.age) : null

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
      <div className="mb-6">
        <p className="auth-eyebrow">Join the community</p>
        <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Create your account</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Start exploring and sharing with the community.</p>
      </div>

      <button type="button" className="google-button" onClick={() => run(continueWithGoogle)} disabled={loading}>
        <span className="google-mark" aria-hidden="true">G</span> Continue with Google
      </button>
      <div className="auth-divider"><span>or use email</span></div>

      <form onSubmit={(e) => { e.preventDefault(); run(() => signup(form)) }} className="space-y-4">
        <Input label="Full name" icon={User} name="name" required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" icon={Mail} type="email" name="email" required placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" icon={Lock} type="password" name="password" minLength="8" required placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Input label="Age" icon={Cake} type="number" name="age" min="6" max="99" required placeholder="e.g. 14" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
        {ageGroup && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-secondary/10 p-3.5">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-secondary-dark" />
            <div><p className="text-sm font-semibold text-secondary-dark">{AGE_GROUP_LABEL[ageGroup]}</p><p className="text-xs text-gray-500">{AGE_GROUP_DESC[ageGroup]}</p></div>
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10">{error}</p>}
        <Button type="submit" fullWidth size="lg" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">Already have an account? <Link to="/login" className="font-semibold text-primary">Log in</Link></p>
    </div>
  )
}
