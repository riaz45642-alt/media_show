const STORAGE_KEY = 'mediashow_user'
const TOKEN_KEY = 'mediashow_token'
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

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch (cause) {
    const error = new Error(`Cannot reach the backend at ${API_URL}. Start it with npm run dev and try again.`, { cause })
    error.code = 'API_UNAVAILABLE'
    throw error
  }
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
  if (getStoredUser()?._firebaseOnly) {
    const firebaseIdToken = localStorage.getItem(TOKEN_KEY)
    if (!firebaseIdToken) throw new Error('Your session has expired. Log in again before verification.')
    storeSession(await request('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ idToken: firebaseIdToken }),
    }))
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
  if (!backendIsUsableFromThisPage()) throw new Error('Account creation requires the production API.')
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
}

export async function login(credentials) {
  if (!backendIsUsableFromThisPage()) throw new Error('Login requires the production API.')
  return storeSession(await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }))
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
