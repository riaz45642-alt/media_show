import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { firebaseAuth } from '../config/firebase'
import { configureGoogleAuth } from './authService'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function backendIsUsableFromThisPage() {
  try {
    const api = new URL(API_URL, window.location.origin)
    const apiIsLocal = ['localhost', '127.0.0.1'].includes(api.hostname)
    const pageIsLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    return !apiIsLocal || pageIsLocal
  } catch {
    return false
  }
}

async function exchangeFirebaseToken(idToken) {
  let response
  try {
    response = await fetch(`${API_URL}/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
  } catch (error) {
    const networkError = new Error('The application server is currently unavailable.', { cause: error })
    networkError.code = 'API_UNAVAILABLE'
    throw networkError
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Google sign-in could not be completed.')
  return data
}

function firebaseOnlySession(firebaseUser, idToken) {
  return {
    token: idToken,
    user: {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member',
      email: firebaseUser.email,
      avatar: firebaseUser.photoURL || '',
      face_verified: false,
      safeZoneScore: 82,
      provider: 'google',
      _firebaseOnly: true,
    },
  }
}

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

configureGoogleAuth({
  async signIn() {
    try {
      const credential = await signInWithPopup(firebaseAuth, googleProvider)
      const idToken = await credential.user.getIdToken()

      // A deployed website cannot call the developer's localhost API. In that
      // case Firebase still supplies a fully verified browser session so the
      // user can sign in and browse. Configure VITE_API_URL with the deployed
      // Express API to enable database provisioning and sensitive actions.
      if (!backendIsUsableFromThisPage()) return firebaseOnlySession(credential.user, idToken)

      try {
        return await exchangeFirebaseToken(idToken)
      } catch (error) {
        if (error.code === 'API_UNAVAILABLE') return firebaseOnlySession(credential.user, idToken)
        throw error
      }
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in was cancelled.', { cause: error })
      }
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Your browser blocked the Google sign-in window. Allow popups and try again.', { cause: error })
      }
      throw error
    }
  },
})
