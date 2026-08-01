import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { getSocket } from '../services/socketService'
import { playNotificationTone, requestNotificationPermission, showBrowserNotification } from '../services/realtimeAlerts'

const NotificationsContext = createContext(null)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('mediashow_token')
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Notification request failed')
  return data
}

const normalize = (item) => ({
  ...item,
  type: item.kind,
  category: item.kind,
  text: item.body || item.title,
  time: new Date(item.created_at).toLocaleString(),
  read: Boolean(item.read_at),
})

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [toasts, setToasts] = useState([])
  const [notificationPermission, setNotificationPermission] = useState(() => 'Notification' in window ? Notification.permission : 'unsupported')

  const refresh = useCallback(async () => {
    if (!user) return setItems([])
    try { setItems((await request('/notifications')).map(normalize)) } catch { setItems([]) }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!user?.id) return undefined
    const socket = getSocket()
    if (!socket) return undefined
    const onNotification = (raw) => {
      const item = normalize(raw)
      setItems((previous) => previous.some((entry) => entry.id === item.id) ? previous : [item, ...previous])
      const alreadyViewing = item.link && window.location.pathname === item.link
      if (!alreadyViewing) {
        setToasts((previous) => [...previous.slice(-2), item])
        playNotificationTone()
        showBrowserNotification({ title: raw.title || 'New notification', body: item.text, link: item.link || '/notifications', tag: `notification-${item.id}` })
      }
    }
    socket.on('notification:new', onNotification)
    return () => socket.off('notification:new', onNotification)
  }, [user?.id])

  const enableBrowserNotifications = async () => {
    const permission = await requestNotificationPermission()
    setNotificationPermission(permission)
    return permission
  }
  const dismissToast = (id) => setToasts((previous) => previous.filter((item) => item.id !== id))

  const markAllRead = async () => {
    await request('/notifications/read-all', { method: 'POST' })
    setItems((previous) => previous.map((item) => ({ ...item, read: true })))
  }
  const markRead = async (id) => {
    await request(`/notifications/${id}/read`, { method: 'POST' })
    setItems((previous) => previous.map((item) => item.id === id ? { ...item, read: true } : item))
  }
  const acceptFollowRequest = async (requestId, notificationId) => {
    await request(`/users/follow-requests/${requestId}/accept`, { method: 'POST' })
    setItems((previous) => previous.map((item) => item.id === notificationId ? { ...item, read: true, accepted: true } : item))
  }
  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items])
  return <NotificationsContext.Provider value={{ items, setItems, unreadCount, markAllRead, markRead, acceptFollowRequest, refresh, toasts, dismissToast, notificationPermission, enableBrowserNotifications }}>{children}</NotificationsContext.Provider>
}

export const useNotifications = () => useContext(NotificationsContext)
