import { createContext, useContext, useEffect, useState } from 'react'
import * as authService from '../services/authService'
import { getAgeGroup } from '../utils/ageGroup'
import { disconnectSocket } from '../services/socketService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(authService.getStoredUser())
    setLoading(false)
  }, [])

  useEffect(() => {
    const synchronizeStoredProfile = (event) => {
      if (event.key === 'mediashow_user') setUser(authService.getStoredUser())
    }
    window.addEventListener('storage', synchronizeStoredProfile)
    return () => window.removeEventListener('storage', synchronizeStoredProfile)
  }, [])

  const login = async (payload) => {
    const u = await authService.login(payload)
    setUser(u)
    return u
  }

  const signup = async (payload) => {
    const u = await authService.signup(payload)
    setUser(u)
    return u
  }

  const continueWithGoogle = async () => {
    const u = await authService.continueWithGoogle()
    setUser(u)
    return u
  }

  const logout = () => {
    disconnectSocket()
    authService.logout()
    setUser(null)
  }

  const updateUser = (patch) => {
    const u = authService.updateStoredUser(patch)
    setUser(u)
    return u
  }

  const refreshUser = async () => {
    const refreshed = await authService.refreshProfile()
    setUser(refreshed)
    return refreshed
  }

  const ageGroup = user ? getAgeGroup(user.age) : null

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, ageGroup, login, signup, continueWithGoogle, logout, updateUser, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
