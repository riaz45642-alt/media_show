import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, User } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/common/EmptyState'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function UserProfileView() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('mediashow_token')
    fetch(`${API_URL}/users/${userId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (response) => {
        if (!response.ok) throw new Error('User not found')
        return response.json()
      })
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <p className="py-10 text-center text-sm text-gray-400">Loading profile...</p>
  if (!profile) return <EmptyState icon={User} title="User not found" description="This profile is no longer available." />

  return (
    <div>
      <button onClick={() => navigate(-1)} aria-label="Back"
        className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-card dark:bg-white/5">
        <ChevronLeft size={18} />
      </button>
      <div className="soft-card p-6 text-center">
        <div className="flex justify-center"><Avatar name={profile.name} size={84} ring /></div>
        <h1 className="mt-3 font-display text-lg font-bold">{profile.name}</h1>
        <p className="text-sm text-gray-400">@{profile.username}</p>
        {profile.bio && <p className="mx-auto mt-3 max-w-md text-sm text-gray-600 dark:text-gray-300">{profile.bio}</p>}
        <p className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-400"><ShieldCheck size={12} /> Registered member</p>
        <div className="mt-5 flex justify-center gap-8">
          <div><p className="font-bold">{profile.post_count}</p><p className="text-xs text-gray-400">Posts</p></div>
          <div><p className="font-bold">{profile.follower_count}</p><p className="text-xs text-gray-400">Followers</p></div>
          <div><p className="font-bold">{profile.following_count}</p><p className="text-xs text-gray-400">Following</p></div>
        </div>
      </div>
    </div>
  )
}
