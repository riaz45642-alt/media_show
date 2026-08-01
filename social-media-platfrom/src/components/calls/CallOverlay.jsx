import { useEffect, useRef } from 'react'
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, SwitchCamera, PhoneMissed, Volume2, VolumeX } from 'lucide-react'
import { useCall } from '../../context/CallContext'

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function CallOverlay() {
  const { call, localStream, remoteStream, duration, error, setError, mediaRequesting, acceptCall, declineCall, endCall, toggleMute, toggleCamera, switchCamera, speakerOn, toggleSpeaker } = useCall()
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream
  }, [localStream])
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream
  }, [remoteStream])
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.muted = !speakerOn
    if (remoteAudioRef.current) remoteAudioRef.current.muted = !speakerOn
  }, [speakerOn, remoteStream])

  if (call.phase === 'idle') return null

  const isVideo = call.kind === 'video'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 text-white">
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      {/* Remote video fills the screen for video calls */}
      {isVideo && call.phase === 'active' && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
      )}
      {!isVideo && <audio ref={remoteAudioRef} autoPlay />}
      {isVideo && call.phase === 'active' && <audio ref={remoteAudioRef} autoPlay className="hidden" />}

      <div className="relative z-10 mt-16 flex flex-col items-center gap-2">
        {call.otherUserAvatar ? <img src={call.otherUserAvatar} alt="" className="h-24 w-24 rounded-full object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-3xl font-semibold">{(call.otherUserName || '?').slice(0, 1).toUpperCase()}</div>}
        <h2 className="text-xl font-semibold">{call.otherUserName}</h2>
        <p className="text-white/70">
          {call.phase === 'incoming' && `Incoming ${call.kind} call...`}
          {call.phase === 'outgoing' && 'Calling...'}
          {call.phase === 'ringing' && 'Ringing...'}
          {call.phase === 'connecting' && 'Connecting...'}
          {call.phase === 'active' && formatDuration(duration)}
          {call.phase === 'ended' && 'Call ended'}
          {call.phase === 'error' && (error || 'Unable to start call')}
        </p>
        {call.remoteMuted && call.phase === 'active' && <span className="text-xs text-white/50">Their mic is muted</span>}
      </div>

      {/* Local preview (video calls) */}
      {isVideo && localStream && call.phase !== 'incoming' && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute right-4 top-4 z-10 h-40 w-28 rounded-xl border border-white/20 object-cover shadow-lg"
        />
      )}

      <div className="relative z-10 mb-12 flex items-center gap-6">
        {call.phase === 'incoming' && (
          <>
            <button onClick={declineCall} className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 hover:bg-red-700" aria-label="Decline call">
              <PhoneMissed size={26} />
            </button>
            <button disabled={mediaRequesting} onClick={acceptCall} className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 hover:bg-green-700 disabled:cursor-wait disabled:opacity-60" aria-label={mediaRequesting ? 'Requesting device permission' : 'Accept call'}>
              <Phone size={26} />
            </button>
          </>
        )}
        {call.phase === 'incoming' && mediaRequesting && <span className="absolute -top-8 text-xs text-white/70">Waiting for device permission…</span>}
        {call.phase === 'error' && <button onClick={() => { setError(null); endCall('failed') }} className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold">Close</button>}

        {(call.phase === 'outgoing' || call.phase === 'ringing' || call.phase === 'connecting' || call.phase === 'active') && (
          <>
            <button onClick={toggleMute} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label="Toggle mute">
              {call.muted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <button onClick={toggleSpeaker} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label="Toggle speaker">
              {speakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>
            {isVideo && (
              <button onClick={toggleCamera} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label="Toggle camera">
                {call.cameraOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}
            {isVideo && (
              <button onClick={switchCamera} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label="Switch camera">
                <SwitchCamera size={22} />
              </button>
            )}
            <button onClick={() => endCall('ended')} className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 hover:bg-red-700" aria-label="End call">
              <PhoneOff size={26} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
