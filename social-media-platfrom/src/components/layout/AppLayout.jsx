import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from '../navigation/BottomNav'

export default function AppLayout() {
  return (
    <div className="min-h-screen gradient-hero">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5 sm:px-6 page-transition">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
