import { useMemo, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert, ListFilter } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import { usePosts } from '../context/PostsContext'

const STATUS_META = {
  safe: { label: 'Approved', color: 'text-secondary-dark bg-secondary/10', Icon: CheckCircle2 },
  flagged: { label: 'Flagged', color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10', Icon: AlertTriangle },
  rejected: { label: 'Removed', color: 'text-red-500 bg-red-50 dark:bg-red-500/10', Icon: XCircle },
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'safe', label: 'Approved' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'rejected', label: 'Removed' },
]

export default function ModerationHistory() {
  const { myPosts } = usePosts()
  const [filter, setFilter] = useState('all')

  const items = useMemo(
    () => myPosts.map((p) => ({ ...p, moderation_status: p.moderation_status || 'safe' })),
    [myPosts]
  )
  const filtered = filter === 'all' ? items : items.filter((p) => p.moderation_status === filter)
  const warnings = items.filter((p) => p.moderation_status === 'rejected').length

  return (
    <div>
      <PageHeader title="Moderation History" subtitle="Every AI and moderator decision on your content, in one place." />

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <StatCard label="Approved" value={items.filter((p) => p.moderation_status === 'safe').length} color="text-secondary-dark" />
        <StatCard label="Flagged" value={items.filter((p) => p.moderation_status === 'flagged').length} color="text-amber-600" />
        <StatCard label="Removed" value={items.filter((p) => p.moderation_status === 'rejected').length} color="text-red-500" />
      </div>

      {warnings > 0 && (
        <div className="soft-card mb-4 flex items-center gap-3 p-4 border border-red-100 dark:border-red-900/30">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500">
            <ShieldAlert size={16} />
          </span>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You have <strong>{warnings}</strong> {warnings === 1 ? 'warning' : 'warnings'} from removed content. Repeated
            violations can affect your Trust Score.
          </p>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <ListFilter size={14} className="shrink-0 text-gray-400" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`tap-scale shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.key ? 'bg-primary text-white' : 'bg-white dark:bg-white/5 text-gray-500 dark:text-gray-300 shadow-card'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing here" description="No content matches this filter." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((post) => {
            const meta = STATUS_META[post.moderation_status] || STATUS_META.safe
            return (
              <div key={post.id} className="soft-card p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.color}`}>
                    <meta.Icon size={11} /> {meta.label}
                  </span>
                  <span className="text-[11px] text-gray-400">{post.time}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200">{post.text}</p>
                {post.moderation_reason && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    AI decision: {post.moderation_reason}
                    {post.risk_score != null && ` (risk score ${post.risk_score}/100)`}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="soft-card p-3.5 text-center">
      <p className={`font-display text-xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-400">{label}</p>
    </div>
  )
}
