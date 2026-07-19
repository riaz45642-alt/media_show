import { ShieldAlert } from 'lucide-react'
import StatusPage from './StatusPage'

export default function Forbidden() {
  return (
    <StatusPage
      icon={ShieldAlert}
      title="Access restricted"
      description="You don't have permission to view this page. If you think this is a mistake, contact support."
    />
  )
}
