import { ShieldCheck } from 'lucide-react'

// Icon-only "Verified" indicator — no text label, tooltip on hover/long-press.
export default function SafeBadge() {
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10 text-secondary-dark dark:text-secondary"
      title="Verified"
      aria-label="Verified"
    >
      <ShieldCheck size={15} />
    </span>
  )
}
