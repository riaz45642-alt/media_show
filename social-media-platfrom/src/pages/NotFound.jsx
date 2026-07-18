import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center text-center px-6">
      <Compass size={48} className="text-primary animate-floatY" />
      <h1 className="mt-4 font-display text-2xl font-bold text-gray-800">Page not found</h1>
      <p className="mt-1 text-sm text-gray-500 max-w-xs">This page wandered off. Let's get you back somewhere safe.</p>
      <Link to="/" className="mt-6">
        <Button>Back to Home</Button>
      </Link>
    </div>
  )
}
