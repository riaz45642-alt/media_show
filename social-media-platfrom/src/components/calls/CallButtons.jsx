import { Phone, Video } from 'lucide-react'
import { useCall } from '../../context/CallContext'

export default function CallButtons({ userId, userName }) {
  const { call, startCall } = useCall()
  const disabled = call.phase !== 'idle'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => startCall(userId, userName, 'voice')}
        className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-black/5 px-2.5 text-xs hover:bg-black/10 disabled:opacity-40 dark:bg-white/10 dark:hover:bg-white/20"
        aria-label="Start voice call"
        title="Voice call"
      >
        <Phone size={18} />
        <span className="hidden sm:inline">Audio</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => startCall(userId, userName, 'video')}
        className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-black/5 px-2.5 text-xs hover:bg-black/10 disabled:opacity-40 dark:bg-white/10 dark:hover:bg-white/20"
        aria-label="Start video call"
        title="Video call"
      >
        <Video size={18} />
        <span className="hidden sm:inline">Video</span>
      </button>
    </div>
  )
}
