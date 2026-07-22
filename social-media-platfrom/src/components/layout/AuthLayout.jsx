import { Outlet } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center animate-slideDown">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand text-white shadow-soft animate-floatY">
          <ShieldCheck size={26} />
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold text-gray-800 dark:text-gray-100">Media Show</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">A calmer, kinder space to share &amp; grow</p>
      </div>
      <div className="w-full max-w-md animate-scaleIn">
        <Outlet />
      </div>
    </div>
  )
}
