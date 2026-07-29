import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { firebaseAuth } from '../config/firebase'
import { configureGoogleAuth } from './authService'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

configureGoogleAuth({
  async signIn() {
    try {
      const credential = await signInWithPopup(firebaseAuth, googleProvider)
      const idToken = await credential.user.getIdToken(true)
      return await exchangeFirebaseToken(idToken)
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
