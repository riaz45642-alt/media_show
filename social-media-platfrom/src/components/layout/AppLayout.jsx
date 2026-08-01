import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from '../navigation/BottomNav'
import { useNotifications } from '../../context/NotificationsContext'

export default function AppLayout() {
  const { pathname } = useLocation()
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
        {toasts.map((toast) => (
          <button key={toast.id} onClick={() => { dismissToast(toast.id); if (toast.link) window.location.assign(toast.link) }} className="rounded-xl border border-gray-200 bg-white p-3 text-left shadow-lg dark:border-white/10 dark:bg-gray-900">
            <span className="block text-sm font-semibold">{toast.title || 'New notification'}</span>
            <span className="block text-sm text-gray-600 dark:text-gray-300">{toast.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
