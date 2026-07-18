import { ShieldCheck } from 'lucide-react'

export default function SafeBadge({ label = 'Verified Safe' }) {
  return (
    <span className="badge-glow inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary-dark dark:text-secondary">
      <ShieldCheck size={13} />
      {label}
    </span>
  )
}
