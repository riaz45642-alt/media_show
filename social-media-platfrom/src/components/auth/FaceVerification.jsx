import { useEffect, useRef, useState } from 'react'
import { Camera, ShieldCheck, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react'
import Button from '../ui/Button'
import { verifyFaceLiveness } from '../../services/authService'

// Two-stage liveness check. Stage 1 runs fully client-side: it captures two
// frames a beat apart while guiding the user to move slightly, then compares
// them for basic motion/lighting sanity. Stage 2 sends a single frame to the
// backend, which asks Gemini's vision model to confirm a real live face is
// present (not a photo-of-a-photo/screen) — that frame is analyzed in memory
// only and is never stored. Neither stage analyzes facial attributes: no
// gender, age, or identity inference happens here or on the server.
const MIN_LUMA = 12
const MAX_LUMA = 245
const MIN_DIFF = 4
const MAX_DIFF = 70

function sampleFrame(video) {
  const canvas = document.createElement('canvas')
  canvas.width = 48
  canvas.height = 48
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, 48, 48)
  return ctx.getImageData(0, 0, 48, 48)
}

function captureJpegBase64(video) {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, 320, 320)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
  return dataUrl.split(',')[1]
}

function frameStats(imgData) {
  let sum = 0
  for (let i = 0; i < imgData.data.length; i += 4) {
    sum += (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3
  }
  return sum / (imgData.data.length / 4)
}

function frameDiff(a, b) {
  let diff = 0
  for (let i = 0; i < a.data.length; i += 4) {
    diff += Math.abs(a.data[i] - b.data[i])
  }
  return diff / (a.data.length / 4)
}

export default function FaceVerification({ onVerified }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [phase, setPhase] = useState('idle') // idle | requesting | live | hold | moving | analyzing | success | failed | denied

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => () => stopCamera(), [])

  const startCamera = async () => {
    setPhase('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setPhase('live')
    } catch {
      setPhase('denied')
    }
  }

  const runVerification = async () => {
    const video = videoRef.current
    if (!video) return
    setPhase('hold')
    await new Promise((r) => setTimeout(r, 1200))
    const frame1 = sampleFrame(video)

    setPhase('moving')
    await new Promise((r) => setTimeout(r, 1400))
    const frame2 = sampleFrame(video)
    const finalShot = captureJpegBase64(video)

    setPhase('analyzing')

    const luma1 = frameStats(frame1)
    const luma2 = frameStats(frame2)
    const diff = frameDiff(frame1, frame2)
    const lumaOk = luma1 > MIN_LUMA && luma1 < MAX_LUMA && luma2 > MIN_LUMA && luma2 < MAX_LUMA
    const diffOk = diff > MIN_DIFF && diff < MAX_DIFF

    if (!lumaOk || !diffOk) {
      stopCamera()
      setPhase('failed')
      return
    }

    // Stage 2: server-side Gemini vision check on the final frame only.
    const serverResult = await verifyFaceLiveness(finalShot)
    stopCamera()

    if (serverResult.verified) {
      setPhase('success')
      // Only a pass/fail + short-lived token is reported back — the frame
      // itself was analyzed in memory on the server and discarded.
      onVerified(serverResult.token || null)
    } else {
      setPhase('failed')
    }
  }

  const retry = () => {
    setPhase('idle')
    startCamera()
  }

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-4">
      <div className="flex items-start gap-2.5 mb-3">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          We just confirm a live person is in front of the camera to keep Media Show free of fake accounts.
          Your final frame is analyzed once by our AI check and immediately discarded — nothing is saved,
          and we never store an image or infer your gender/age from it. Your profile picture is set
          separately, later, if you choose to add one.
        </p>
      </div>

      <div className="relative mx-auto flex h-56 w-56 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${phase === 'live' || phase === 'hold' || phase === 'moving' || phase === 'analyzing' ? '' : 'hidden'}`} />
        {(phase === 'idle' || phase === 'requesting' || phase === 'denied') && (
          <Camera size={30} className="text-gray-400" />
        )}
        {phase === 'success' && <CheckCircle2 size={48} className="text-secondary" />}
        {phase !== 'idle' && phase !== 'success' && phase !== 'denied' && (
          <span className="pointer-events-none absolute inset-3 rounded-full border-2 border-dashed border-primary/50" />
        )}
      </div>

      <p className="mt-3 text-center text-sm font-medium text-gray-700 dark:text-gray-200">
        {phase === 'idle' && 'Ready to verify your face'}
        {phase === 'requesting' && 'Requesting camera access…'}
        {phase === 'live' && 'Center your face in the circle'}
        {phase === 'hold' && 'Hold still…'}
        {phase === 'moving' && 'Slowly turn your head a little'}
        {phase === 'analyzing' && 'Verifying…'}
        {phase === 'success' && 'Verified ✓'}
        {phase === 'failed' && "Couldn't confirm a live face"}
        {phase === 'denied' && 'Camera access was denied'}
      </p>

      <div className="mt-3 flex justify-center">
        {phase === 'idle' && <Button type="button" onClick={startCamera}>Start camera</Button>}
        {phase === 'live' && <Button type="button" onClick={runVerification}>Verify now</Button>}
        {(phase === 'failed' || phase === 'denied') && (
          <Button type="button" variant="outline" onClick={retry}>
            <RotateCcw size={15} className="mr-1.5" /> Try again
          </Button>
        )}
      </div>

      {phase === 'failed' && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-red-500">
          <AlertTriangle size={13} /> Make sure you're in good lighting and move slightly when asked.
        </p>
      )}
      {phase === 'denied' && (
        <p className="mt-2 text-center text-xs text-red-500">
          Camera permission is required to complete verification. Please allow access and try again.
        </p>
      )}
    </div>
  )
}
