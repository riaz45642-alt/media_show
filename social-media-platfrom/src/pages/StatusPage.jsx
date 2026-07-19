import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

// Shared visual shell for 403 / 500 / Maintenance / Offline pages so they
// all feel like one polished, on-brand family instead of one-off screens.
export default function StatusPage({ icon: Icon, title, description, actionLabel = 'Back to Home', actionTo = '/' }) {
  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center text-center px-6">
      <Icon size={48} className="text-primary animate-floatY" />
      <h1 className="mt-4 font-display text-2xl font-bold text-gray-800">{title}</h1>
      <p className="mt-1 text-sm text-gray-500 max-w-xs">{description}</p>
      <Link to={actionTo} className="mt-6">
        <Button>{actionLabel}</Button>
      </Link>
    </div>
  )
}
