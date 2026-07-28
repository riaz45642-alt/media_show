import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center animate-slideDown">
        <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Media Show</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">A place to share what matters</p>
      </div>
      <div className="w-full max-w-md animate-scaleIn">
        <Outlet />
      </div>
    </div>
  )
}
