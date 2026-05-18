import { useCallback, useEffect, useState } from 'react'
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from '../api/auth'
import type { User } from '../types/user'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setInitializing(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginUser(email, password)
    setUser(next)
    return next
  }, [])

  const signup = useCallback(async (email: string, password: string, displayName?: string) => {
    const next = await registerUser(email, password, displayName)
    setUser(next)
    return next
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
    setUser(null)
  }, [])

  return {
    user,
    isLoggedIn: user != null,
    initializing,
    login,
    signup,
    logout,
  }
}
