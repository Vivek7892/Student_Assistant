import axios from 'axios'
import { useAuth } from '../store/authStore'

// Empty baseURL = use Vite proxy in dev; VITE_API_URL = backend URL in production
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const AUTH_PATHS = ['/api/auth/login/', '/api/auth/register/', '/api/auth/token/refresh/']

let _refreshing: Promise<string | null> | null = null

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const url: string = original?.url ?? ''

    if (AUTH_PATHS.some(p => url.includes(p))) {
      return Promise.reject(err)
    }

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!_refreshing) {
        _refreshing = useAuth.getState().refreshAccessToken().finally(() => { _refreshing = null })
      }
      const newToken = await _refreshing
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)
