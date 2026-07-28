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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 disabled:opacity-40 dark:bg-white/10 dark:hover:bg-white/20"
        aria-label="Start voice call"
        title="Voice call"
      >
        <Phone size={18} />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => startCall(userId, userName, 'video')}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 disabled:opacity-40 dark:bg-white/10 dark:hover:bg-white/20"
        aria-label="Start video call"
        title="Video call"
      >
        <Video size={18} />
      </button>
    </div>
  )
}
