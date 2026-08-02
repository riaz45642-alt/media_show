import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function ScreenTimeGuard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [status, setStatus] = useState(null)
  const lastActivity = useRef(Date.now())

  useEffect(() => {
    if (!user?.id) { setStatus(null); return undefined }
    const token = localStorage.getItem('mediashow_token')
    const sessionKey = 'mediashow_usage_session'
    let sessionId = sessionStorage.getItem(sessionKey)
    if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem(sessionKey, sessionId) }
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    const activity = () => { lastActivity.current = Date.now() }
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart']
    events.forEach((name) => window.addEventListener(name, activity, { passive: true }))

    const check = async (heartbeat = false) => {
      if (document.hidden || Date.now() - lastActivity.current > 120000) return
      try {
        const response = await fetch(`${API_URL}/parent-controls/usage${heartbeat ? '/heartbeat' : ''}`, {
          method: heartbeat ? 'POST' : 'GET', headers,
          ...(heartbeat ? { body: JSON.stringify({ sessionId }) } : {}),
        })
        if (response.ok) setStatus(await response.json())
      } catch { /* the next heartbeat retries without blocking the app */ }
    }
    check(false)
    const timer = setInterval(() => check(true), 30000)
    return () => {
      clearInterval(timer)
      events.forEach((name) => window.removeEventListener(name, activity))
    }
  }, [user?.id])

  if (!status?.limit_reached || pathname === '/parent-controls') return null
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/95 p-5 text-center text-white">
      <div className="max-w-md">
        <Clock size={52} className="mx-auto mb-5 text-primary" />
        <h1 className="text-2xl font-bold">Daily Time Limit Reached</h1>
        <p className="mt-3 text-gray-300">You have reached your allowed screen time for today. Please ask your parent if you need additional time.</p>
        <p className="mt-2 text-sm text-gray-500">Usage resets automatically at the beginning of the next UTC day.</p>
        <button onClick={() => navigate('/parent-controls')} className="mt-6 rounded-full bg-primary px-5 py-2.5 font-semibold">Parent Controls</button>
      </div>
    </div>
  )
}
