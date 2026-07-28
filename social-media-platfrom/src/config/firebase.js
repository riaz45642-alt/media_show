import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyBkLwzu2KD0uM4Imd8jdFXfK5i52xr6vGs',
  authDomain: 'social-media-platform-57498.firebaseapp.com',
  projectId: 'social-media-platform-57498',
  storageBucket: 'social-media-platform-57498.firebasestorage.app',
  messagingSenderId: '429460008259',
  appId: '1:429460008259:web:366f26774982e8b92553f6',
  measurementId: 'G-Q0GYGQR2WB',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(firebaseApp)

// Analytics is optional and must not prevent authentication in unsupported
// browsers, SSR, test runners, or privacy-restricted environments.
export const analyticsReady = analyticsIsSupported()
  .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
  .catch(() => null)
