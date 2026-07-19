import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Lock, ShieldCheck } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import EmptyState from '../components/common/EmptyState'
import { USERS, FOLLOWERS, FOLLOWING } from '../data/users'

export default function UserProfileView() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const user = USERS.find((u) => u.id === userId)

  const alreadyFollowing = FOLLOWING.some((u) => u.id === userId)
  const [following, setFollowing] = useState(alreadyFollowing)

  if (!user) {
    return (
      <EmptyState
        icon={Lock}
        title="User not found"
        description="This profile doesn't exist or is no longer available."
      />
    )
  }

  // Private accounts only reveal content/lists to accounts they've approved
  // (approximated here as: the current user already follows them).
  const locked = user.isPrivate && !following

  const followerCount = FOLLOWERS.filter((u) => u.id !== userId).length
  const followingCount = FOLLOWING.filter((u) => u.id !== userId).length

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        aria-label="Back"
        className="tap-scale mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-white/5 shadow-card text-gray-500"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="soft-card p-6 text-center animate-scaleIn">
        <div className="flex justify-center">
          <Avatar name={user.name} src={user.avatar} color={user.color} size={84} ring />
        </div>
        <h2 className="mt-3 flex items-center justify-center gap-1.5 font-display text-lg font-bold text-gray-800 dark:text-gray-100">
          {user.name}
          {user.isPrivate && <Lock size={14} className="text-gray-400" />}
        </h2>
        <p className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <ShieldCheck size={12} /> {user.isPrivate ? 'Private account' : 'Public account'}
        </p>

        <div className="mt-4 flex items-center justify-center gap-6">
          {locked ? (
            <>
              <div>
                <p className="font-display text-lg font-bold text-gray-800 dark:text-gray-100">—</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-gray-800 dark:text-gray-100">—</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Following</p>
              </div>
            </>
          ) : (
            <>
              <Link to={`/users/${user.id}/followers`} className="hover-lift">
                <p className="font-display text-lg font-bold text-gray-800 dark:text-gray-100">{followerCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
              </Link>
              <Link to={`/users/${user.id}/following`} className="hover-lift">
                <p className="font-display text-lg font-bold text-gray-800 dark:text-gray-100">{followingCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Following</p>
              </Link>
            </>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <Button variant={following ? 'outline' : 'primary'} size="sm" onClick={() => setFollowing((f) => !f)}>
            {following ? 'Following' : 'Follow'}
          </Button>
        </div>
      </div>

      {locked && (
        <div className="mt-4">
          <EmptyState
            icon={Lock}
            title="This account is private"
            description={`Follow ${user.name} to see their posts, followers & following.`}
          />
        </div>
      )}
    </div>
  )
}
