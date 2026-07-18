import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Cake, Camera, ShieldCheck } from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { getAgeGroup, AGE_GROUP_LABEL, AGE_GROUP_DESC } from '../utils/ageGroup'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', age: '' })
  const [avatarPreview, setAvatarPreview] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleAvatar = (e) => {
    const file = e.target.files?.[0]
    if (file) setAvatarPreview(URL.createObjectURL(file))
  }

  const ageGroup = form.age ? getAgeGroup(form.age) : null

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      signup({ ...form, avatar: avatarPreview })
      setLoading(false)
      navigate('/')
    }, 600)
  }

  return (
    <div className="soft-card p-7">
      <h2 className="font-display text-xl font-bold text-gray-800 dark:text-gray-100">Create your account</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
        We tailor content protection based on your age.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center">
          <label className="relative cursor-pointer">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-primary/40 bg-primary/5">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar preview" className="h-full w-full object-cover" />
              ) : (
                <Camera size={22} className="text-primary" />
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
          </label>
        </div>
        <p className="text-center text-[11px] text-gray-400 -mt-2">
          Used only for future AI age-verification reference
        </p>

        <Input
          label="Full name"
          icon={User}
          name="name"
          required
          placeholder="Your name"
          value={form.name}
          onChange={handleChange}
        />
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
        <Input
          label="Age"
          icon={Cake}
          type="number"
          name="age"
          min="6"
          max="99"
          required
          placeholder="e.g. 14"
          value={form.age}
          onChange={handleChange}
        />

        {ageGroup && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-secondary/10 p-3.5 animate-scaleIn">
            <ShieldCheck size={18} className="mt-0.5 text-secondary-dark shrink-0" />
            <div>
              <p className="text-sm font-semibold text-secondary-dark dark:text-secondary">{AGE_GROUP_LABEL[ageGroup]}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{AGE_GROUP_DESC[ageGroup]}</p>
            </div>
          </div>
        )}

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary">
          Log in
        </Link>
      </p>
    </div>
  )
}
