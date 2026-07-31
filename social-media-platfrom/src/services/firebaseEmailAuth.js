import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { firebaseAuth } from '../config/firebase'

function messageForFirebaseError(error, mode) {
  const messages = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Use a stronger password with at least 8 characters.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Unable to reach Firebase. Check your internet connection and try again.',
    'auth/operation-not-allowed': 'Email and password sign-in must be enabled in Firebase Console.',
  }
  return messages[error.code] || (mode === 'signup'
    ? 'Account creation could not be completed.'
    : 'Login could not be completed.')
}

async function firebaseSession(firebaseUser, extraProfile = {}) {
  return {
    token: await firebaseUser.getIdToken(),
    user: {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || extraProfile.name || firebaseUser.email?.split('@')[0] || 'Member',
      email: firebaseUser.email,
      avatar: firebaseUser.photoURL || '',
      age: extraProfile.age ? Number(extraProfile.age) : null,
      safeZoneScore: 82,
      provider: 'password',
      _firebaseOnly: true,
    },
  }
}

export async function signupWithFirebase(userData) {
  try {
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth,
      userData.email.trim(),
      userData.password
    )
    await updateProfile(credential.user, { displayName: userData.name.trim() })
    return firebaseSession(credential.user, userData)
  } catch (error) {
    throw new Error(messageForFirebaseError(error, 'signup'), { cause: error })
  }
}

export async function loginWithFirebase(credentials) {
  try {
    const credential = await signInWithEmailAndPassword(
      firebaseAuth,
      credentials.email.trim(),
      credentials.password
    )
    return firebaseSession(credential.user)
  } catch (error) {
    throw new Error(messageForFirebaseError(error, 'login'), { cause: error })
  }
}
