import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, User, AtSign, FileText, Mail } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import { useAuth } from '../context/AuthContext'
import ContentFilterWarning from '../components/common/ContentFilterWarning'
import { filterTextContent } from '../utils/contentFilter'

export default function EditProfile() {
  const { user, updateUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    contactEmail: user?.contact_email || '',
  })
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [saved, setSaved] = useState(false)
  const [blockedTerms, setBlockedTerms] = useState([])
  const initialProfile = useRef({ name: user?.name || '', username: user?.username || '', bio: user?.bio || '', contactEmail: user?.contact_email || '' })

  useEffect(() => {
    const token = localStorage.getItem('mediashow_token')
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(async (response) => {
      if (!response.ok) return
      const profile = await response.json()
      const hydrated = { name: profile.name || '', username: profile.username || '', bio: profile.bio || '', contactEmail: profile.contact_email || '' }
      initialProfile.current = hydrated
      setForm(hydrated)
      setAvatarPreview(profile.avatar_url || user?.avatar || '')
    }).catch(() => {})
  }, [user?.avatar])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const handleAvatar = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    // Use a base64 data URL (not URL.createObjectURL) since the avatar is
    // persisted to localStorage — object URLs are revoked/invalidated on
    // reload and would leave the profile picture broken after refresh.
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault()
    const nameResult = filterTextContent(form.name, { context: 'identifier' })
    const bioResult = filterTextContent(form.bio)
    const blocked = [...new Set([...nameResult.blockedTerms, ...bioResult.blockedTerms])]
    setBlockedTerms(blocked)
    if (blocked.length) return
    setError('')
    setSaving(true)
    try {
      const token = localStorage.getItem('mediashow_token')
      const normalized = { name: form.name.trim(), username: form.username.trim().toLowerCase(), bio: form.bio.trim(), contactEmail: form.contactEmail.trim().toLowerCase() }
      const patch = Object.fromEntries(Object.entries(normalized).filter(([key, value]) => value !== initialProfile.current[key]))
      if (!Object.keys(patch).length && !avatarFile) {
        setSaved(true)
        setTimeout(() => navigate('/profile'), 400)
        return
      }
      let updatedProfile = {}
      if (Object.keys(patch).length) {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/me`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(patch),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          setError(data.code === 'USERNAME_TAKEN' ? 'That username is already taken.' : (data.message || `Unable to save profile (${response.status}).`))
          return
        }
        updatedProfile = data.user || {}
      }
      let savedAvatar = user?.avatar || ''
      if (avatarFile) {
        const avatarBody = new FormData()
        avatarBody.append('avatar', avatarFile)
        const avatarResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/me/avatar`, {
          method: 'PUT', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: avatarBody,
        })
        const avatarData = await avatarResponse.json().catch(() => ({}))
        if (!avatarResponse.ok) {
          setError(avatarData.message || `Unable to save profile image (${avatarResponse.status}).`)
          return
        }
        savedAvatar = avatarData.avatar_url
      }
      initialProfile.current = normalized
      updateUser({ ...updatedProfile, avatar: savedAvatar, avatar_url: savedAvatar })
      await refreshUser()
      setSaved(true)
      setTimeout(() => navigate('/profile'), 700)
    } catch (requestError) {
      setError(requestError.message || 'Unable to reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
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
        <Input
          label="Contact Email (optional)"
          icon={Mail}
          type="email"
          name="contactEmail"
          placeholder="Only shown if you add it"
          value={form.contactEmail}
          onChange={handleChange}
          maxLength={160}
        />
        <p className="text-xs text-gray-400">Your login email is private. This separate address is shown publicly only if you enter it.</p>
        <ContentFilterWarning matches={blockedTerms} />
        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" fullWidth size="lg" disabled={saving}>
          {saved ? 'Saved ✓' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
