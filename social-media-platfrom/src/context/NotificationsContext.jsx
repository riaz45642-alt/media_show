import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

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

  const refresh = useCallback(async () => {
    if (!user) return setItems([])
    try { setItems((await request('/notifications')).map(normalize)) } catch { setItems([]) }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

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
  return <NotificationsContext.Provider value={{ items, setItems, unreadCount, markAllRead, markRead, acceptFollowRequest, refresh }}>{children}</NotificationsContext.Provider>
}

export const useNotifications = () => useContext(NotificationsContext)
