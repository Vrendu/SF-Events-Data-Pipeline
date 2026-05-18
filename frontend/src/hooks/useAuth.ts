import { useCallback, useState } from 'react'
import type { User } from '../types/user'
import { clearStoredUser, readStoredUser, writeStoredUser } from '../utils/authStorage'

function userFromEmail(email: string, displayName?: string): User {
  const normalized = email.trim().toLowerCase()
  return {
    id: `local-${normalized}`,
    email: normalized,
    displayName: displayName?.trim() || normalized.split('@')[0] || 'User',
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => readStoredUser())

  const login = useCallback((email: string, _password: string) => {
    const next = userFromEmail(email)
    writeStoredUser(next)
    setUser(next)
    return next
  }, [])

  const signup = useCallback((email: string, _password: string, displayName?: string) => {
    const next = userFromEmail(email, displayName)
    writeStoredUser(next)
    setUser(next)
    return next
  }, [])

  const logout = useCallback(() => {
    clearStoredUser()
    setUser(null)
  }, [])

  return { user, isLoggedIn: user != null, login, signup, logout }
}
