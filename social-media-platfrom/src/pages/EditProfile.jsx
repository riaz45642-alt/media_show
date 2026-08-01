import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, User, AtSign, FileText } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import { useAuth } from '../context/AuthContext'
import ContentFilterWarning from '../components/common/ContentFilterWarning'
import { filterTextContent } from '../utils/contentFilter'

export default function EditProfile() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
  })
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '')
  const [saved, setSaved] = useState(false)
  const [blockedTerms, setBlockedTerms] = useState([])
  const initialProfile = useRef({ name: user?.name || '', username: user?.username || '', bio: user?.bio || '' })

  useEffect(() => {
    const token = localStorage.getItem('mediashow_token')
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(async (response) => {
      if (!response.ok) return
      const profile = await response.json()
      const hydrated = { name: profile.name || '', username: profile.username || '', bio: profile.bio || '' }
      initialProfile.current = hydrated
      setForm(hydrated)
      setAvatarPreview(profile.avatar_url || user?.avatar || '')
    }).catch(() => {})
  }, [user?.avatar])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const handleAvatar = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Use a base64 data URL (not URL.createObjectURL) since the avatar is
    // persisted to localStorage — object URLs are revoked/invalidated on
    // reload and would leave the profile picture broken after refresh.
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const [error, setError] = useState('')
  const handleSubmit = async (e) => {
    e.preventDefault()
    const nameResult = filterTextContent(form.name, { context: 'identifier' })
    const bioResult = filterTextContent(form.bio)
    const blocked = [...new Set([...nameResult.blockedTerms, ...bioResult.blockedTerms])]
    setBlockedTerms(blocked)
    if (blocked.length) return
    setError('')
    const token = localStorage.getItem('mediashow_token')
    const normalized = { name: form.name.trim(), username: form.username.trim().toLowerCase(), bio: form.bio.trim() }
    const patch = Object.fromEntries(Object.entries(normalized).filter(([key, value]) => value !== initialProfile.current[key]))
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/me`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(patch),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.code === 'USERNAME_TAKEN' ? 'That username is already taken.' : (data.message || 'Unable to save profile.'))
      return
    }
    updateUser({ ...data.user, avatar: avatarPreview })
    setSaved(true)
    setTimeout(() => navigate('/profile'), 700)
  }

  return (
    <div>
      <PageHeader title="Edit Profile" subtitle="Keep your information up to date." />

      <form onSubmit={handleSubmit} className="soft-card p-6 space-y-4">
        <div className="flex justify-center">
          <label className="relative cursor-pointer">
            <Avatar name={form.name || 'You'} src={avatarPreview} size={90} ring />
            <span className="tap-scale absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-soft">
              <Camera size={14} />
            </span>
            <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
          </label>
        </div>

        <Input label="Full name" icon={User} name="name" value={form.name} onChange={handleChange} />
        <Input label="Username" icon={AtSign} name="username" value={form.username} onChange={handleChange} />

        <Input
          label="Bio"
          icon={FileText}
          name="bio"
          textarea
          placeholder="Tell others a little about you..."
          value={form.bio}
          onChange={(e) => { handleChange(e); setBlockedTerms([]) }}
          maxLength={200}
        />
        <p className="text-right text-xs text-gray-400">{form.bio.length}/200</p>
        <ContentFilterWarning matches={blockedTerms} />
        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" fullWidth size="lg">
          {saved ? 'Saved ✓' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
