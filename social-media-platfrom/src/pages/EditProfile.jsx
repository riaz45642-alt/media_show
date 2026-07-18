import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, User, Cake, FileText } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import { useAuth } from '../context/AuthContext'

export default function EditProfile() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: user?.name || '',
    age: user?.age || '',
    bio: user?.bio || '',
  })
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '')
  const [saved, setSaved] = useState(false)

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

  const handleSubmit = (e) => {
    e.preventDefault()
    updateUser({ ...form, avatar: avatarPreview })
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
        <Input label="Age" icon={Cake} type="number" name="age" value={form.age} onChange={handleChange} />
        <Input
          label="Bio"
          icon={FileText}
          name="bio"
          textarea
          placeholder="Tell others a little about you..."
          value={form.bio}
          onChange={handleChange}
        />

        <Button type="submit" fullWidth size="lg">
          {saved ? 'Saved ✓' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
