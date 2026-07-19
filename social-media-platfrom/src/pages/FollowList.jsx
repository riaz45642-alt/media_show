import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Lock, Users } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/common/EmptyState'
import { useAuth } from '../context/AuthContext'
import { USERS, FOLLOWERS, FOLLOWING } from '../data/users'

export default function FollowList({ type }) {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const viewingOwnProfile = !userId
  const target = viewingOwnProfile ? null : USERS.find((u) => u.id === userId)
  const displayName = viewingOwnProfile ? user?.name || 'You' : target?.name || 'User'
  const title = type === 'followers' ? 'Followers' : 'Following'

  // Reuse the shared mock pool (minus the profile owner) as that user's list.
  const list = (type === 'followers' ? FOLLOWERS : FOLLOWING).filter((u) => u.id !== userId)

  // Privacy gate: your own lists are always visible to you. Someone else's
  // private account only shows its lists to accounts they've approved —
  // approximated here as "the current user already follows them".
  const isPrivateTarget = !viewingOwnProfile && target?.isPrivate
  const isApprovedFollower = FOLLOWING.some((u) => u.id === userId)
  const canView = viewingOwnProfile || !isPrivateTarget || isApprovedFollower

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-white/5 shadow-card text-gray-500"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h1>
          <p className="text-xs text-gray-400">{displayName}{canView ? ` · ${list.length}` : ''}</p>
        </div>
      </div>

      {!canView ? (
        <EmptyState
          icon={Lock}
          title="This account is private"
          description={`Only approved followers can see ${displayName}'s ${title.toLowerCase()}.`}
        />
      ) : list.length === 0 ? (
        <EmptyState icon={Users} title={`No ${title.toLowerCase()} yet`} description="This list is empty right now." />
      ) : (
        <div className="space-y-2">
          {list.map((u) => (
            <Link
              key={u.id}
              to={`/users/${u.id}`}
              className="soft-card flex items-center gap-3.5 p-4 hover-lift animate-slideUp"
            >
              <Avatar name={u.name} src={u.avatar} color={u.color} size={46} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {u.name}
                  {u.isPrivate && <Lock size={12} className="text-gray-400" />}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {u.isPrivate ? 'Private account' : 'Public account'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
