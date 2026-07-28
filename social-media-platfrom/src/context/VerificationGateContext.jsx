import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Modal from '../components/ui/Modal'
import FaceVerification from '../components/auth/FaceVerification'
import { useAuth } from './AuthContext'

const VerificationGateContext = createContext(null)

export function VerificationGateProvider({ children }) {
  const { user, updateUser } = useAuth()
  const [request, setRequest] = useState(null)
  const pendingAction = useRef(null)
  const verified = Boolean(user?.face_verified || user?.faceVerified)

  const requireVerification = useCallback((action, actionLabel = 'continue') => {
    if (verified) return action()
    pendingAction.current = action
    setRequest({ actionLabel })
    return undefined
  }, [verified])

  const close = () => {
    pendingAction.current = null
    setRequest(null)
  }

  const handleVerified = () => {
    updateUser({ face_verified: true, faceVerified: true, face_verified_at: new Date().toISOString() })
    const action = pendingAction.current
    pendingAction.current = null
    setRequest(null)
    action?.()
  }

  return (
    <VerificationGateContext.Provider value={{ verified, requireVerification }}>
      {children}
      <Modal open={Boolean(request)} onClose={close} title="Verify before you interact">
        <p className="mb-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
          You can browse Media Show without verification. To {request?.actionLabel}, complete this one-time liveness check.
        </p>
        <FaceVerification onVerified={handleVerified} />
        <button type="button" onClick={close} className="mt-4 w-full py-2 text-sm font-medium text-gray-500">Not now</button>
      </Modal>
    </VerificationGateContext.Provider>
  )
}

export const useVerificationGate = () => useContext(VerificationGateContext)
