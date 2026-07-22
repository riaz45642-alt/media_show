import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Cake, ShieldCheck, ArrowLeft } from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import FaceVerification from '../components/auth/FaceVerification'
import { useAuth } from '../context/AuthContext'
import { getAgeGroup, AGE_GROUP_LABEL, AGE_GROUP_DESC } from '../utils/ageGroup'

const GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'female', label: 'Woman' },
  { value: 'male', label: 'Man' },
  { value: 'other', label: 'Non-binary' },
]

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('details') // details | verify
  const [form, setForm] = useState({ name: '', email: '', password: '', age: '', gender: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const ageGroup = form.age ? getAgeGroup(form.age) : null

  const goToVerification = (e) => {
    e.preventDefault()
    setStep('verify')
  }

  const completeSignup = (faceToken) => {
    setLoading(true)
    setTimeout(() => {
      // Only a verification flag + timestamp is stored — no face image is
      // captured or saved anywhere, and gender is exactly what the person
      // selected above (never inferred from their face). faceToken proves
      // to the backend that the Gemini liveness check actually passed.
      signup({ ...form, faceVerified: true, faceVerifiedAt: new Date().toISOString(), faceToken })
      setLoading(false)
      navigate('/')
    }, 500)
  }

  if (step === 'verify') {
    return (
      <div className="soft-card p-7">
        <button
          onClick={() => setStep('details')}
          className="tap-scale mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <h2 className="font-display text-xl font-bold text-gray-800 dark:text-gray-100">Verify it's really you</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">
          One last step before your account is created.
        </p>

        <FaceVerification onVerified={completeSignup} />

        {loading && (
          <p className="mt-4 text-center text-sm font-medium text-primary">Creating your account…</p>
        )}
      </div>
    )
  }

  return (
    <div className="soft-card p-7">
      <h2 className="font-display text-xl font-bold text-gray-800 dark:text-gray-100">Create your account</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
        We tailor content protection based on your age.
      </p>

      <form onSubmit={goToVerification} className="space-y-4">
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

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
            Gender <span className="font-normal text-gray-400">(optional, set by you)</span>
          </label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus-ring"
          >
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {ageGroup && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-secondary/10 p-3.5 animate-scaleIn">
            <ShieldCheck size={18} className="mt-0.5 text-secondary-dark shrink-0" />
            <div>
              <p className="text-sm font-semibold text-secondary-dark dark:text-secondary">{AGE_GROUP_LABEL[ageGroup]}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{AGE_GROUP_DESC[ageGroup]}</p>
            </div>
          </div>
        )}

        <Button type="submit" fullWidth size="lg">
          Continue to face verification
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
