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

async function readMediaPermission(name) {
  if (!navigator.permissions?.query) return 'unsupported'
  try {
    return (await navigator.permissions.query({ name })).state
  } catch {
    // Safari and some Android browsers do not expose camera/microphone
    // through Permissions API. getUserMedia remains the authoritative check.
    return 'unsupported'
  }
}

export function CallProvider({ children }) {
  const { user } = useAuth()
  const [call, setCall] = useState(initialCall)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(null)
  const [mediaRequesting, setMediaRequesting] = useState(false)
  const [mediaPermission, setMediaPermission] = useState({ microphone: 'unknown', camera: 'unknown' })
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

  const getMedia = useCallback(async (kind) => {
    const needsVideo = kind === 'video'
    const startedAt = Date.now()
    const before = {
      microphone: await readMediaPermission('microphone'),
      camera: needsVideo ? await readMediaPermission('camera') : 'not-required',
    }
    setMediaPermission(before)
    console.info('[call-media]', { event: 'permission-check', kind, secureContext: window.isSecureContext, permissions: before })

    if (!window.isSecureContext) {
      const securityError = new Error('Calls require a secure HTTPS connection.')
      securityError.name = 'SecurityError'
      setError(securityError.message)
      throw securityError
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const unsupportedError = new Error('This browser does not support microphone or camera access.')
      unsupportedError.name = 'NotSupportedError'
      setError(unsupportedError.message)
      throw unsupportedError
    }

    setMediaRequesting(true)
    try {
      // This is deliberately executed only from the Start/Accept button's
      // user gesture. Incoming socket events never request device access.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: needsVideo ? { facingMode: { ideal: facingModeRef.current } } : false,
      })
      const after = {
        microphone: await readMediaPermission('microphone'),
        camera: needsVideo ? await readMediaPermission('camera') : 'not-required',
      }
      setMediaPermission(after)
      localStreamRef.current = stream
      setLocalStream(stream)
      console.info('[call-media]', {
        event: 'stream-created', kind, permissions: after,
        audioTracks: stream.getAudioTracks().length, videoTracks: stream.getVideoTracks().length,
        elapsedMs: Date.now() - startedAt,
      })
      return stream
    } catch (err) {
      const after = {
        microphone: await readMediaPermission('microphone'),
        camera: needsVideo ? await readMediaPermission('camera') : 'not-required',
      }
      setMediaPermission(after)
      const blocked = after.microphone === 'denied' || (needsVideo && after.camera === 'denied')
      const requestedDevices = needsVideo ? 'microphone and camera' : 'microphone'
      const messages = {
        NotAllowedError: blocked
          ? `${requestedDevices[0].toUpperCase()}${requestedDevices.slice(1)} access is blocked. Open this site's permissions, choose Allow, then tap Accept again.`
          : `Please allow ${requestedDevices} access in the browser permission prompt, then tap Accept again.`,
        NotFoundError: `No ${kind === 'video' ? 'camera or microphone' : 'microphone'} was found on this device.`,
        NotReadableError: 'Your camera or microphone is already in use by another application.',
        OverconstrainedError: 'This device cannot satisfy the requested camera settings.',
        SecurityError: 'Calls require a secure HTTPS connection.',
        AbortError: 'The device permission request was interrupted. Tap Accept to try again.',
      }
      const message = messages[err.name] || `Unable to access your ${requestedDevices}. Check browser and phone permissions, then try again.`
      setError(message)
      console.error('[call-media]', {
        event: 'stream-failed', kind, errorName: err.name, errorMessage: err.message,
        permissions: after, elapsedMs: Date.now() - startedAt,
      })
      throw err
    } finally {
      setMediaRequesting(false)
    }
  }, [])

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
  }, [cleanup, getMedia])

  const acceptCall = useCallback(async () => {
    const socket = getSocket()
    if (!socket || call.phase !== 'incoming') return
    try {
      console.info('[call-media]', { event: 'accept-clicked', kind: call.kind, callId: call.callId })
      const stream = await getMedia(call.kind)
      const pc = createPeerConnection(call.otherUserId, call.callId)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      console.info('[call-webrtc]', { event: 'peer-created', callId: call.callId, tracks: stream.getTracks().map((track) => track.kind) })
    } catch { return }
    stopRingtone()
    socket.emit('call:accept', { callId: call.callId })
    setCall((c) => ({ ...c, phase: 'connecting' }))
  }, [call, createPeerConnection, getMedia])

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
        call, localStream, remoteStream, duration, error, setError, mediaRequesting, mediaPermission,
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
