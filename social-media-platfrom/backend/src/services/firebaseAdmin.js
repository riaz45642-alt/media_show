import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function credentialFromEnvironment() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let serviceAccount
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    } catch (error) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid JSON', { cause: error })
    }
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
    }
    return cert(serviceAccount)
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
export const firebaseRevocationChecksEnabled = process.env.FIREBASE_CHECK_REVOKED !== 'false'
