import { useEffect, useRef, useState } from 'react'
import { Wind, X, RotateCcw } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

// A short guided breathing exercise. Cycles through inhale / hold / exhale
// phases with matching durations and a growing/shrinking circle, then ends
// with a calm affirmation. Designed as a genuinely useful "unique feature"
// that fits Media Show's calm, wellbeing-first positioning — not something
// you'd find bolted onto a typical feed-and-likes social app.

const PHASES = [
  { key: 'inhale', label: 'Breathe in', seconds: 4, scale: 1.35 },
  { key: 'hold', label: 'Hold', seconds: 4, scale: 1.35 },
  { key: 'exhale', label: 'Breathe out', seconds: 6, scale: 0.85 },
]

const TOTAL_CYCLES = 3

const AFFIRMATIONS = [
  "You're doing great. Nice and calm. 🌿",
  'A little pause goes a long way. 💛',
  'Nicely done — feel that reset? ✨',
]

export default function MindfulBreakModal({ open, onClose }) {
  const [cycle, setCycle] = useState(0)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef(null)

  const phase = PHASES[phaseIdx]

  useEffect(() => {
    if (!open) return
    setCycle(0)
    setPhaseIdx(0)
    setDone(false)
  }, [open])

  useEffect(() => {
    if (!open || done) return
    timerRef.current = setTimeout(() => {
      if (phaseIdx < PHASES.length - 1) {
        setPhaseIdx((i) => i + 1)
      } else if (cycle < TOTAL_CYCLES - 1) {
        setCycle((c) => c + 1)
        setPhaseIdx(0)
      } else {
        setDone(true)
      }
    }, phase.seconds * 1000)
    return () => clearTimeout(timerRef.current)
  }, [open, phaseIdx, cycle, done, phase.seconds])

  const restart = () => {
    setCycle(0)
    setPhaseIdx(0)
    setDone(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Mindful Break">
      <div className="flex flex-col items-center py-4">
        {!done ? (
          <>
            <div className="relative flex h-48 w-48 items-center justify-center">
              <div
                className="absolute rounded-full bg-primary/15 transition-transform ease-in-out"
                style={{
                  width: 140,
                  height: 140,
                  transform: `scale(${phase.scale})`,
                  transitionDuration: `${phase.seconds}s`,
                }}
              />
              <div
                className="absolute rounded-full bg-primary/25 transition-transform ease-in-out"
                style={{
                  width: 100,
                  height: 100,
                  transform: `scale(${phase.scale})`,
                  transitionDuration: `${phase.seconds}s`,
                }}
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full gradient-brand text-white shadow-soft">
                <Wind size={22} />
              </div>
            </div>
            <p className="mt-6 font-display text-lg font-semibold text-gray-800 dark:text-gray-100">
              {phase.label}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Round {cycle + 1} of {TOTAL_CYCLES}
            </p>
          </>
        ) : (
          <div className="text-center animate-scaleIn">
            <span className="text-4xl">🌤️</span>
            <p className="mt-3 font-display text-lg font-semibold text-gray-800 dark:text-gray-100">
              {AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]}
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button variant="ghost" size="sm" onClick={restart}>
                <RotateCcw size={14} /> Again
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                <X size={14} /> Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
