const STORAGE_KEY = 'mediashow_user'
const TOKEN_KEY = 'mediashow_token'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

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

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || data.reason || 'Something went wrong. Please try again.')
    error.code = data.code
    error.status = response.status
    throw error
  }
  return data
}

function storeSession({ user, token }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  if (token) localStorage.setItem(TOKEN_KEY, token)
  return user
}

export async function verifyFaceLiveness(firstFrameBase64, secondFrameBase64) {
  if (!backendIsUsableFromThisPage()) {
    throw new Error('Face verification requires the deployed API. Configure VITE_API_URL with your backend HTTPS URL.')
  }
  const data = await request('/auth/verify-face', {
    method: 'POST',
    body: JSON.stringify({
      imageBase64: firstFrameBase64,
      imageBase64Second: secondFrameBase64,
      imageMimeType: 'image/jpeg',
    }),
  })
  if (data.verified) updateStoredUser({ face_verified: true, faceVerified: true, face_verified_at: data.verifiedAt })
  return data
}

export async function signup(userData) {
  if (!backendIsUsableFromThisPage()) {
    const { signupWithFirebase } = await import('./firebaseEmailAuth.js')
    return storeSession(await signupWithFirebase(userData))
  }
  try {
    return storeSession(await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        age: Number(userData.age),
        gender: userData.gender || '',
      }),
    }))
  } catch (error) {
    if (!error.status) {
      const { signupWithFirebase } = await import('./firebaseEmailAuth.js')
      return storeSession(await signupWithFirebase(userData))
    }
    if (!DEMO_MODE || error.status) throw error
    return storeSession({
      user: {
        id: crypto.randomUUID(), name: userData.name, email: userData.email,
        age: Number(userData.age), gender: userData.gender, face_verified: false,
        safeZoneScore: 82, createdAt: new Date().toISOString(), _demoMode: true,
      },
    })
  }
}

export async function login(credentials) {
  if (!backendIsUsableFromThisPage()) {
    const { loginWithFirebase } = await import('./firebaseEmailAuth.js')
    return storeSession(await loginWithFirebase(credentials))
  }
  try {
    return storeSession(await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }))
  } catch (error) {
    if (!error.status) {
      const { loginWithFirebase } = await import('./firebaseEmailAuth.js')
      return storeSession(await loginWithFirebase(credentials))
    }
    if (!DEMO_MODE || error.status) throw error
    return storeSession({
      user: {
        id: crypto.randomUUID(), name: credentials.email.split('@')[0], email: credentials.email,
        age: 18, face_verified: false, safeZoneScore: 82, _demoMode: true,
      },
    })
  }
}

// A provider adapter keeps the UI independent of Firebase. Configure a
// Firebase adapter once at app startup; it must resolve to { user, token }.
let googleProvider = null
export function configureGoogleAuth(provider) {
  googleProvider = provider
}

export async function continueWithGoogle() {
  if (!googleProvider) {
    await import('./firebaseGoogleAuth.js')
  }
  if (!googleProvider) throw new Error('Google sign-in could not be initialized.')
  return storeSession(await googleProvider.signIn())
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function updateStoredUser(patch) {
  const updated = { ...(getStoredUser() || {}), ...patch }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}
