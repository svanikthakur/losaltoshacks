import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { api } from './api'

type User = { id: string; email: string; name: string } | null
type Ctx = {
  user: User
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
}

const AuthCtx = createContext<Ctx>(null as any)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('ac_token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem('ac_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const r = await api.login({ email, password })
    localStorage.setItem('ac_token', r.token)
    setUser(r.user)
  }
  const signup = async (email: string, password: string, name: string) => {
    const r = await api.signup({ email, password, name })
    localStorage.setItem('ac_token', r.token)
    setUser(r.user)
  }
  const logout = () => {
    localStorage.removeItem('ac_token')
    setUser(null)
  }

  return <AuthCtx.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}
