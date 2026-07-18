// Mock auth layer. Replace internals with real fetch() calls to /backend/routes/auth.js
const STORAGE_KEY = 'safezone_user'

export function signup(userData) {
  const user = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    safeZoneScore: 82,
    badges: ['Newcomer'],
    ...userData,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  return user
}

export function login({ email }) {
  const existing = getStoredUser()
  if (existing && existing.email === email) return existing
  // demo fallback so login "works" even without a prior signup
  const user = {
    id: crypto.randomUUID(),
    name: email.split('@')[0] || 'Explorer',
    email,
    age: 16,
    avatar: '',
    safeZoneScore: 82,
    badges: ['Newcomer'],
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  return user
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY)
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
  const current = getStoredUser() || {}
  const updated = { ...current, ...patch }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}
