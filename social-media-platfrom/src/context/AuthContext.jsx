import { createContext, useContext, useEffect, useState } from 'react'
import * as authService from '../services/authService'
import { getAgeGroup } from '../utils/ageGroup'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(authService.getStoredUser())
    setLoading(false)
  }, [])

  const login = (payload) => {
    const u = authService.login(payload)
    setUser(u)
    return u
  }

  const signup = (payload) => {
    const u = authService.signup(payload)
    setUser(u)
    return u
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const updateUser = (patch) => {
    const u = authService.updateStoredUser(patch)
    setUser(u)
    return u
  }

  const ageGroup = user ? getAgeGroup(user.age) : null

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, ageGroup, login, signup, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
