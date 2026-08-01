import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getSocket } from '../services/socketService'
import { useAuth } from './AuthContext'
import { showBrowserNotification, startRingtone, stopRingtone } from '../services/realtimeAlerts'

const CallContext = createContext(null)

const turnServer = import.meta.env.VITE_TURN_URL ? [{
  urls: import.meta.env.VITE_TURN_URL,
  username: import.meta.env.VITE_TURN_USERNAME,
  credential: import.meta.env.VITE_TURN_CREDENTIAL,
}] : []
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...turnServer,
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
  const [speakerOn, setSpeakerOn] = useState(true)

  const pcRef = useRef(null)
  const otherUserIdRef = useRef(null)
  const durationTimerRef = useRef(null)
  const facingModeRef = useRef('user')
  const localStreamRef = useRef(null)
  const callRef = useRef(initialCall)
  const pendingCandidatesRef = useRef([])

  useEffect(() => { callRef.current = call }, [call])

  const cleanup = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
    clearInterval(durationTimerRef.current)
    setDuration(0)
    otherUserIdRef.current = null
    pendingCandidatesRef.current = []
    stopRingtone()
  }, [])

  const getMedia = async (kind) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'video' ? { facingMode: facingModeRef.current } : false,
      })
      localStreamRef.current = stream
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

    otherUserIdRef.current = calleeId
    setCall({ phase: 'outgoing', kind, otherUserId: calleeId, otherUserName: calleeName })

    try {
      await getMedia(kind)
    } catch { return }

    socket.timeout(10_000).emit('call:invite', { calleeId, kind }, (timeoutError, res) => {
      if (timeoutError) {
        setError('Call server did not respond. Please check your connection and try again.')
        cleanup()
        setCall((current) => ({ ...current, phase: 'error' }))
        return
      }
      if (res?.error) {
        setError(res.message || res.error)
        cleanup()
        setCall((current) => ({ ...current, phase: 'error' }))
        return
      }
      setCall({ phase: 'ringing', callId: res.callId, roomId: res.roomId, kind, otherUserId: calleeId, otherUserName: calleeName })
    })
  }, [cleanup])

  const acceptCall = useCallback(async () => {
    const socket = getSocket()
    if (!socket || call.phase !== 'incoming') return
    try {
      const stream = await getMedia(call.kind)
      const pc = createPeerConnection(call.otherUserId, call.callId)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
    } catch { return }
    stopRingtone()
    socket.emit('call:accept', { callId: call.callId })
    setCall((c) => ({ ...c, phase: 'connecting' }))
  }, [call, createPeerConnection])

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
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    getSocket()?.emit('call:media-state', { callId: call.callId, to: otherUserIdRef.current, muted: !track.enabled })
    setCall((c) => ({ ...c, muted: !track.enabled }))
  }, [call.callId])

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    getSocket()?.emit('call:media-state', { callId: call.callId, to: otherUserIdRef.current, cameraOff: !track.enabled })
    setCall((c) => ({ ...c, cameraOff: !track.enabled }))
  }, [call.callId])

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
  const toggleSpeaker = useCallback(() => setSpeakerOn((value) => !value), [])

  // Wire socket listeners once.
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user?.id) return

    const onIncoming = (payload) => {
      setCall((c) => {
        if (c.phase !== 'idle') {
          socket.emit('call:decline', { callId: payload.callId })
          return c
        }
        otherUserIdRef.current = payload.callerId
        startRingtone()
        showBrowserNotification({ title: 'Incoming call', body: `${payload.callerName || 'Someone'} is calling you.`, link: '/messages', tag: `call-${payload.callId}` })
        return { phase: 'incoming', callId: payload.callId, roomId: payload.roomId, kind: payload.kind, otherUserId: payload.callerId, otherUserName: payload.callerName, otherUserAvatar: payload.callerAvatar }
      })
    }

    const onAccepted = async ({ callId, roomId, role, peerId }) => {
      stopRingtone()
      otherUserIdRef.current = peerId
      setCall((c) => (c.callId === callId ? { ...c, phase: 'connecting', roomId } : c))
      let pc = pcRef.current
      if (!pc) {
        pc = createPeerConnection(peerId, callId)
        const stream = localStreamRef.current
        stream?.getTracks().forEach((track) => pc.addTrack(track, stream))
      }
      if (role === 'caller') {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('call:signal', { callId, to: peerId, data: { sdp: offer } })
      }
    }
    const onRinging = ({ callId }) => setCall((current) => current.callId === callId ? { ...current, phase: 'ringing' } : current)

    const onSignal = async ({ callId, from, data }) => {
      let pc = pcRef.current
      if (!pc) {
        pc = createPeerConnection(from, callId)
        const stream = localStreamRef.current
        stream?.getTracks().forEach((track) => pc.addTrack(track, stream))
      }
      if (data.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
        for (const candidate of pendingCandidatesRef.current.splice(0)) await pc.addIceCandidate(candidate)
        if (data.sdp.type === 'offer') {
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit('call:signal', { callId, to: from, data: { sdp: answer } })
        }
      } else if (data.candidate) {
        const candidate = new RTCIceCandidate(data.candidate)
        if (pc.remoteDescription) await pc.addIceCandidate(candidate)
        else pendingCandidatesRef.current.push(candidate)
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
    socket.on('call:ringing', onRinging)
    socket.on('call:signal', onSignal)
    socket.on('call:declined', onDeclined)
    socket.on('call:rejected', onDeclined)
    socket.on('call:ended', onEnded)
    socket.on('call:timeout', onTimeout)
    socket.on('call:media-state', onMediaState)

    return () => {
      socket.off('call:incoming', onIncoming)
      socket.off('call:accepted', onAccepted)
      socket.off('call:ringing', onRinging)
      socket.off('call:signal', onSignal)
      socket.off('call:declined', onDeclined)
      socket.off('call:rejected', onDeclined)
      socket.off('call:ended', onEnded)
      socket.off('call:timeout', onTimeout)
      socket.off('call:media-state', onMediaState)
    }
  }, [user?.id, createPeerConnection, cleanup])

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
        startCall, acceptCall, declineCall, endCall, toggleMute, toggleCamera, switchCamera, speakerOn, toggleSpeaker,
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
