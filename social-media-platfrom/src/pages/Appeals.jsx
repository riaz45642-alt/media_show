import { useEffect, useMemo, useState } from 'react'
import { Scale, AlertTriangle, Clock, CheckCircle2, XCircle, Send } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { usePosts } from '../context/PostsContext'
import { submitAppeal, listMyAppeals } from '../services/appealService'

const STATUS_META = {
  pending: { label: 'Pending Review', color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10', Icon: Clock },
  approved: { label: 'Approved', color: 'text-secondary-dark bg-secondary/10', Icon: CheckCircle2 },
  rejected: { label: 'Not Approved', color: 'text-red-500 bg-red-50 dark:bg-red-500/10', Icon: XCircle },
}

export default function Appeals() {
  const { myPosts } = usePosts()
  const [appeals, setAppeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const appealedContentIds = useMemo(() => new Set(appeals.map((a) => a.content_id)), [appeals])

  const appealablePosts = useMemo(
    () => myPosts.filter((p) => p.moderation_status && ['flagged', 'rejected'].includes(p.moderation_status)),
    [myPosts]
  )

  const load = async () => {
    setLoading(true)
    try {
      setAppeals(await listMyAppeals())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const activePost = appealablePosts.find((p) => p.id === activeId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!activePost || explanation.trim().length < 10) {
      setError('Please add at least 10 characters explaining your appeal.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitAppeal({
        contentType: 'post',
        contentId: activePost.id,
        explanation: explanation.trim(),
        originalStatus: activePost.moderation_status,
        aiReason: activePost.moderation_reason,
        riskScore: activePost.risk_score,
      })
      setActiveId(null)
      setExplanation('')
      await load()
    } catch (err) {
      setError(err.message || 'Failed to submit appeal')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Appeals" subtitle="Understand moderation decisions and ask for a human review." />

      {appealablePosts.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Content you can appeal</p>
          <div className="space-y-2.5">
            {appealablePosts.map((post) => {
              const alreadyAppealed = appealedContentIds.has(post.id)
              return (
                <div key={post.id} className="soft-card p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-500">
                      <AlertTriangle size={11} />
                      {post.moderation_status === 'rejected' ? 'Rejected' : 'Flagged'}
                    </span>
                    {post.risk_score != null && (
                      <span className="text-[11px] text-gray-400">AI risk score: {post.risk_score}/100</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 mb-1.5">{post.text}</p>
                  {post.moderation_reason && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      AI moderation reason: {post.moderation_reason}
                    </p>
                  )}

                  {activeId === post.id ? (
                    <form onSubmit={handleSubmit} className="space-y-2.5">
                      <Input
                        textarea
                        label="Why should this be reconsidered?"
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder="Add context the moderator should know..."
                      />
                      {error && <p className="text-xs text-red-500">{error}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={submitting}>
                          <Send size={13} /> {submitting ? 'Submitting…' : 'Submit appeal'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setActiveId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      size="sm"
                      variant={alreadyAppealed ? 'ghost' : 'outline'}
                      disabled={alreadyAppealed}
                      onClick={() => {
                        setActiveId(post.id)
                        setError('')
                      }}
                    >
                      <Scale size={13} /> {alreadyAppealed ? 'Appeal submitted' : 'Appeal this decision'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Your appeal history</p>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : appeals.length === 0 ? (
        <EmptyState icon={Scale} title="No appeals yet" description="Appeals you submit will be tracked here." />
      ) : (
        <div className="space-y-2.5">
          {appeals.map((a) => {
            const meta = STATUS_META[a.status] || STATUS_META.pending
            return (
              <div key={a.id} className="soft-card p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.color}`}>
                    <meta.Icon size={11} /> {meta.label}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-1">{a.explanation}</p>
                {a.moderator_note && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 border-t border-gray-100 dark:border-white/10 pt-1.5">
                    Moderator feedback: {a.moderator_note}
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
