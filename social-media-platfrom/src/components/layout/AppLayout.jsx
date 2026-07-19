import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from '../navigation/BottomNav'

export default function AppLayout() {
  const { pathname } = useLocation()
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
    </div>
  )
}
