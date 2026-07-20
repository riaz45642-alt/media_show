import { createContext, useContext, useMemo, useState } from 'react'
import { NOTIFICATIONS } from '../data/notifications'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState(NOTIFICATIONS)

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  const markRead = (id) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])

  const value = { items, setItems, unreadCount, markAllRead, markRead }

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export const useNotifications = () => useContext(NotificationsContext)
