import { AlertOctagon } from 'lucide-react'
import StatusPage from './StatusPage'

export default function ServerError() {
  return (
    <StatusPage
      icon={AlertOctagon}
      title="Something went wrong"
      description="Our team has been notified. Please try again in a moment."
      actionLabel="Try Again"
      actionTo="/"
    />
  )
}
