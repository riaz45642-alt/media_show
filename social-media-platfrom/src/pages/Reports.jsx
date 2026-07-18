import { useState } from 'react'
import { Flag, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const REASONS = [
  'Harmful or hateful language',
  'Inappropriate image or video',
  'Bullying or harassment',
  'Spam or scam',
  'Something else',
]

export default function Reports() {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-scaleIn">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 text-secondary-dark animate-floatY">
          <CheckCircle2 size={30} />
        </span>
        <h2 className="mt-4 font-display text-lg font-bold text-gray-800 dark:text-gray-100">Report received</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          Our Smart Ethical Shield team will review this within 24 hours. Thank you for keeping SafeZone kind.
        </p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Report Content" subtitle="Help us keep SafeZone safe for everyone." />
      <form onSubmit={handleSubmit} className="soft-card p-6 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">What's the issue?</p>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setReason(r)}
                className={`tap-scale w-full text-left rounded-2xl border p-3 text-sm transition-colors duration-300 flex items-center gap-2.5 ${
                  reason === r ? 'border-primary/40 bg-primary/10 text-primary font-semibold' : 'border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300'
                }`}
              >
                <Flag size={14} />
                {r}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Additional details (optional)"
          textarea
          placeholder="Tell us more so we can help faster..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <Button type="submit" fullWidth size="lg" variant="danger" disabled={!reason}>
          Submit Report
        </Button>
      </form>
    </div>
  )
}
