import { io } from 'socket.io-client'

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')
const TOKEN_KEY = 'mediashow_token'

let socket = null
let socketToken = null

export function getSocket() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null

  if (socket && socketToken !== token) {
    socket.disconnect()
    socket = null
  }
  if (!socket) {
    socketToken = token
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
  socketToken = null
}
