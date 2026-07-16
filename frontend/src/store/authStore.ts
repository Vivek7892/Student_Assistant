import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: 'student' | 'instructor' | 'admin'
  avatar?: string
  is_verified: boolean
  student_profile?: { streak: number; xp: number; level: number }
}

interface AuthStore {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<string | null>
}

const authApi = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '' })

async function post(path: string, body: object) {
  try {
    const res = await authApi.post(path, body)
    return res.data
  } catch (err: any) {
    throw err?.response?.data ?? err
  }
}

function extractError(err: any): string {
  if (!err) return 'Something went wrong'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  const flat = Object.values(err)
    .flat()
    .filter((v): v is string => typeof v === 'string')
  return (
    err.detail ||
    err.non_field_errors?.[0] ||
    err.email?.[0] ||
    err.password?.[0] ||
    flat.join(' ') ||
    'Something went wrong'
  )
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
        try {
          const data = await post('/api/auth/login/', { email, password })
          set({ token: data.tokens.access, refreshToken: data.tokens.refresh, user: data.user, isAuthenticated: true })
        } catch (err: any) {
          throw new Error(extractError(err))
        }
      },

      register: async (name, email, password) => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
        try {
          const data = await post('/api/auth/register/', {
            full_name: name.trim(), email, password, confirm_password: password,
          })
          set({ token: data.tokens.access, refreshToken: data.tokens.refresh, user: data.user, isAuthenticated: true })
        } catch (err: any) {
          throw new Error(extractError(err))
        }
      },

      logout: async () => {
        const { refreshToken } = get()
        if (refreshToken) {
          await post('/api/auth/logout/', { refresh: refreshToken }).catch(() => {})
        }
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
          return null
        }
        try {
          const data = await post('/api/auth/token/refresh/', { refresh: refreshToken })
          set({ token: data.access, refreshToken: data.refresh ?? refreshToken })
          return data.access as string
        } catch {
          set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
          return null
        }
      },
    }),
    {
      name: 'studybuddy-auth-v2',
      onRehydrateStorage: () => (state) => {
        if (state && !state.token) {
          state.isAuthenticated = false
          state.user = null
          state.refreshToken = null
        }
      },
    }
  )
)
