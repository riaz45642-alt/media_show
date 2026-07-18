import { CheckCircle2, Circle } from 'lucide-react'
import { useState } from 'react'

export default function ChallengeCard({ challenge }) {
  const [done, setDone] = useState(challenge.done)

  return (
    <button
      onClick={() => setDone((d) => !d)}
      className={`tap-scale w-full flex items-center justify-between rounded-2xl border p-3.5 text-left transition-colors duration-300 ${
        done
          ? 'border-secondary/30 bg-secondary/10'
          : 'border-gray-100 dark:border-white/10 bg-white dark:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        {done ? (
          <CheckCircle2 size={20} className="text-secondary shrink-0" />
        ) : (
          <Circle size={20} className="text-gray-300 shrink-0" />
        )}
        <span className={`text-sm font-medium ${done ? 'text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
          {challenge.title}
        </span>
      </div>
      <span className="shrink-0 rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-accent-dark">
        +{challenge.points} pts
      </span>
    </button>
  )
}
