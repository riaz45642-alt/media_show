import { io } from 'socket.io-client'

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')
const TOKEN_KEY = 'mediashow_token'
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

let socket = null

export function getSocket() {
  let storedUser = null
  try { storedUser = JSON.parse(localStorage.getItem('mediashow_user') || 'null') } catch { /* ignore invalid storage */ }
  if (DEMO_MODE || storedUser?._demoMode) return null
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
