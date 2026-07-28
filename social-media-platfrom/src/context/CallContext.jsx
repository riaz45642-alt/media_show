import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getSocket } from '../services/socketService'
import { useAuth } from './AuthContext'

const CallContext = createContext(null)

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

// call.phase: 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active' | 'ended' | 'error'
const initialCall = { phase: 'idle' }

export function CallProvider({ children }) {
  const { user } = useAuth()
  const [call, setCall] = useState(initialCall)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(null)

  const pcRef = useRef(null)
  const otherUserIdRef = useRef(null)
  const durationTimerRef = useRef(null)
  const facingModeRef = useRef('user')

  const cleanup = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    localStream?.getTracks().forEach((t) => t.stop())
    setLocalStream(null)
    setRemoteStream(null)
    clearInterval(durationTimerRef.current)
    setDuration(0)
    otherUserIdRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream])

  const getMedia = async (kind) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'video' ? { facingMode: facingModeRef.current } : false,
      })
      setLocalStream(stream)
      return stream
    } catch (err) {
      setError('Camera/microphone permission denied. Please allow access to make calls.')
      throw err
    }
  }

  const createPeerConnection = useCallback((targetUserId, callId) => {
    const socket = getSocket()
    const pc = new RTCPeerConnection(ICE_SERVERS)

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('call:signal', { callId, to: targetUserId, data: { candidate: event.candidate } })
      }
    }
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCall((c) => ({ ...c, phase: 'active' }))
      }
      if (['failed', 'disconnected'].includes(pc.connectionState)) {
        // Reconnection handling: try an ICE restart before giving up.
        pc.restartIce?.()
      }
    }
    pcRef.current = pc
    return pc
  }, [])

  const startCall = useCallback(async (calleeId, calleeName, kind = 'voice') => {
    setError(null)
    const socket = getSocket()
    if (!socket) return setError('Not connected. Please refresh and try again.')

    try {
      await getMedia(kind)
    } catch { return }

    socket.emit('call:invite', { calleeId, kind }, (res) => {
      if (res?.error) {
        setError(res.message || res.error)
        cleanup()
        return
      }
      otherUserIdRef.current = calleeId
      setCall({ phase: 'outgoing', callId: res.callId, roomId: res.roomId, kind, otherUserId: calleeId, otherUserName: calleeName })
    })
  }, [cleanup])

  const acceptCall = useCallback(async () => {
    const socket = getSocket()
    if (!socket || call.phase !== 'incoming') return
    try {
      await getMedia(call.kind)
    } catch { return }
    socket.emit('call:accept', { callId: call.callId })
    setCall((c) => ({ ...c, phase: 'connecting' }))
  }, [call])

  const declineCall = useCallback(() => {
    const socket = getSocket()
    if (call.callId) socket?.emit('call:decline', { callId: call.callId })
    cleanup()
    setCall(initialCall)
  }, [call, cleanup])

  const endCall = useCallback((reason = 'ended') => {
    const socket = getSocket()
    if (call.callId) socket?.emit('call:end', { callId: call.callId, reason })
    cleanup()
    setCall(initialCall)
  }, [call, cleanup])

  const toggleMute = useCallback(() => {
    if (!localStream) return
    const track = localStream.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    getSocket()?.emit('call:media-state', { callId: call.callId, to: otherUserIdRef.current, muted: !track.enabled })
    setCall((c) => ({ ...c, muted: !track.enabled }))
  }, [localStream, call.callId])

  const toggleCamera = useCallback(() => {
    if (!localStream) return
    const track = localStream.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    getSocket()?.emit('call:media-state', { callId: call.callId, to: otherUserIdRef.current, cameraOff: !track.enabled })
    setCall((c) => ({ ...c, cameraOff: !track.enabled }))
  }, [localStream, call.callId])

  const switchCamera = useCallback(async () => {
    if (!localStream || call.kind !== 'video') return
    facingModeRef.current = facingModeRef.current === 'user' ? 'environment' : 'user'
    const oldVideoTrack = localStream.getVideoTracks()[0]
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingModeRef.current } })
      const newTrack = newStream.getVideoTracks()[0]
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video')
      await sender?.replaceTrack(newTrack)
      oldVideoTrack?.stop()
      localStream.removeTrack(oldVideoTrack)
      localStream.addTrack(newTrack)
      setLocalStream(new MediaStream(localStream.getTracks()))
    } catch {
      setError('Could not switch camera on this device.')
    }
  }, [localStream, call.kind])

  // Wire socket listeners once.
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user) return

    const onIncoming = (payload) => {
      setCall((c) => {
        if (c.phase !== 'idle') {
          socket.emit('call:decline', { callId: payload.callId })
          return c
        }
        otherUserIdRef.current = payload.callerId
        return { phase: 'incoming', callId: payload.callId, roomId: payload.roomId, kind: payload.kind, otherUserId: payload.callerId, otherUserName: payload.callerName }
      })
    }

    const onAccepted = async ({ callId, roomId }) => {
      setCall((c) => (c.callId === callId ? { ...c, phase: 'connecting', roomId } : c))
      const targetUserId = otherUserIdRef.current
      const pc = createPeerConnection(targetUserId, callId)
      const stream = localStream
      stream?.getTracks().forEach((t) => pc.addTrack(t, stream))

      // Caller (the one who is 'outgoing') creates the offer.
      setCall((current) => {
        if (current.otherUserId === targetUserId && current.callId === callId) {
          ;(async () => {
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            socket.emit('call:signal', { callId, to: targetUserId, data: { sdp: offer } })
          })()
        }
        return current
      })
    }

    const onSignal = async ({ from, data }) => {
      const pc = pcRef.current
      if (!pc) return
      if (data.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
        if (data.sdp.type === 'offer') {
          const stream = localStream
          stream?.getTracks().forEach((t) => {
            if (!pc.getSenders().find((s) => s.track === t)) pc.addTrack(t, stream)
          })
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          getSocket()?.emit('call:signal', { callId: call.callId, to: from, data: { sdp: answer } })
        }
      } else if (data.candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)) } catch { /* ignore late candidates */ }
      }
    }

    const onDeclined = () => { cleanup(); setCall(initialCall) }
    const onEnded = ({ durationSeconds }) => {
      setCall((c) => ({ ...c, phase: 'ended', lastDuration: durationSeconds }))
      cleanup()
      setTimeout(() => setCall(initialCall), 1500)
    }
    const onTimeout = () => { cleanup(); setCall(initialCall) }
    const onMediaState = ({ muted, cameraOff }) => {
      setCall((c) => ({ ...c, remoteMuted: muted, remoteCameraOff: cameraOff }))
    }

    socket.on('call:incoming', onIncoming)
    socket.on('call:accepted', onAccepted)
    socket.on('call:signal', onSignal)
    socket.on('call:declined', onDeclined)
    socket.on('call:ended', onEnded)
    socket.on('call:timeout', onTimeout)
    socket.on('call:media-state', onMediaState)

    return () => {
      socket.off('call:incoming', onIncoming)
      socket.off('call:accepted', onAccepted)
      socket.off('call:signal', onSignal)
      socket.off('call:declined', onDeclined)
      socket.off('call:ended', onEnded)
      socket.off('call:timeout', onTimeout)
      socket.off('call:media-state', onMediaState)
    }
  }, [user, localStream, createPeerConnection, cleanup, call.callId])

  // Duration timer once active.
  useEffect(() => {
    if (call.phase === 'active') {
      durationTimerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } else {
      clearInterval(durationTimerRef.current)
      if (call.phase === 'idle') setDuration(0)
    }
    return () => clearInterval(durationTimerRef.current)
  }, [call.phase])

  return (
    <CallContext.Provider
      value={{
        call, localStream, remoteStream, duration, error, setError,
        startCall, acceptCall, declineCall, endCall, toggleMute, toggleCamera, switchCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  )
}

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used within CallProvider')
  return ctx
}
