import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function credentialFromEnvironment() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return applicationDefault()
  return undefined
}

const credential = credentialFromEnvironment()
const appOptions = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'social-media-platform-57498',
  ...(credential ? { credential } : {}),
}
const app = getApps()[0] || initializeApp(appOptions)

export const firebaseAdminAuth = getAuth(app)
export const firebaseRevocationChecksEnabled = Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS
)
