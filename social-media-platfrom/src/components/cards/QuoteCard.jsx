import { Sparkles } from 'lucide-react'

export default function QuoteCard({ quote }) {
  return (
    <div className="gradient-brand rounded-2xl p-5 text-white shadow-soft animate-scaleIn relative overflow-hidden">
      <Sparkles size={60} className="absolute -right-3 -top-3 text-white/10" />
      <p className="font-display text-lg font-semibold leading-snug relative">"{quote.text}"</p>
      <p className="mt-2 text-xs text-white/80 relative">— {quote.author}</p>
    </div>
  )
}
