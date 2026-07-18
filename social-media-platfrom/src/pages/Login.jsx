import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      login(form)
      setLoading(false)
      navigate('/')
    }, 500)
  }

  return (
    <div className="soft-card p-7">
      <h2 className="font-display text-xl font-bold text-gray-800 dark:text-gray-100">Welcome back</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">Log in to your safe corner of the internet.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          icon={Mail}
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
        />
        <Input
          label="Password"
          icon={Lock}
          type="password"
          name="password"
          required
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
        />
        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? 'Signing in...' : 'Log In'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        New here?{' '}
        <Link to="/signup" className="font-semibold text-primary">
          Create an account
        </Link>
      </p>
    </div>
  )
}
