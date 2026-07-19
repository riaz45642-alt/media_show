import { Wrench } from 'lucide-react'
import StatusPage from './StatusPage'

export default function Maintenance() {
  return (
    <StatusPage
      icon={Wrench}
      title="Down for maintenance"
      description="We're making things better. Please check back shortly."
      actionLabel="Refresh"
      actionTo="/"
    />
  )
}
