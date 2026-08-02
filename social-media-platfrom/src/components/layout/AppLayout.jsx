import { useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import TopBar from './TopBar'
import BottomNav from '../navigation/BottomNav'
import { useNotifications } from '../../context/NotificationsContext'

export default function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { toasts, dismissToast } = useNotifications()
  // Reels get an edge-to-edge, full-viewport experience — no top bar or
  // page padding — matching a typical short-video feed.
  const isImmersive = pathname === '/videos'

  return (
    <div className="min-h-screen gradient-hero">
      {!isImmersive && <TopBar />}
      <main className={isImmersive ? '' : 'mx-auto max-w-3xl px-4 pb-28 pt-5 sm:px-6 page-transition'}>
        <Outlet />
      </main>
      <BottomNav />
      <div className="fixed right-4 top-20 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => <NotificationToast key={toast.id} toast={toast} onDismiss={dismissToast} onOpen={(link) => navigate(link)} />)}
      </div>
    </div>
  )
}

function NotificationToast({ toast, onDismiss, onOpen }) {
  const startX = useRef(null)
  const [offset, setOffset] = useState(0)
  const finishSwipe = () => {
    if (Math.abs(offset) > 70) onDismiss(toast.id)
    else setOffset(0)
    startX.current = null
  }

  return (
    <div
      role="status"
      className="touch-pan-y rounded-xl border border-gray-200 bg-white p-3 text-left shadow-lg transition-transform dark:border-white/10 dark:bg-gray-900"
      style={{ transform: `translateX(${offset}px)`, opacity: Math.max(0.45, 1 - Math.abs(offset) / 220) }}
      onPointerDown={(event) => { startX.current = event.clientX; event.currentTarget.setPointerCapture?.(event.pointerId) }}
      onPointerMove={(event) => { if (startX.current !== null) setOffset(event.clientX - startX.current) }}
      onPointerUp={finishSwipe}
      onPointerCancel={finishSwipe}
    >
      <div className="flex items-start gap-2">
        <button className="min-w-0 flex-1 text-left" onClick={() => { onDismiss(toast.id); if (toast.link) onOpen(toast.link) }}>
          <span className="block text-sm font-semibold">{toast.title || 'New notification'}</span>
          <span className="block text-sm text-gray-600 dark:text-gray-300">{toast.text}</span>
        </button>
        <button type="button" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
