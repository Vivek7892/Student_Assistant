import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { User, AuthTokens } from '@/types'

interface LoginPayload { email: string; password: string }
interface RegisterPayload { email: string; first_name: string; last_name: string; password: string; confirm_password: string; role: string }
interface AuthResponse { user: User; tokens: AuthTokens; message?: string }

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: LoginPayload) => api.post<AuthResponse>('/auth/login/', data).then((r) => r.data),
    onSuccess: ({ user, tokens }) => {
      setAuth(user, tokens)
      toast.success(`Welcome back, ${user.first_name}!`)
      if (user.role === 'admin') navigate('/admin')
      else if (user.role === 'teacher') navigate('/teacher')
      else navigate('/student')
    },
    onError: () => toast.error('Invalid credentials'),
  })
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: RegisterPayload) => api.post<AuthResponse>('/auth/register/', data).then((r) => r.data),
    onSuccess: ({ user, tokens }) => {
      setAuth(user, tokens)
      toast.success('Account created! Please verify your email.')
      if (user.role === 'teacher') navigate('/teacher')
      else navigate('/student')
    },
    onError: (err: any) => toast.error(err.response?.data?.email?.[0] || 'Registration failed'),
  })
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const tokens = useAuthStore((s) => s.tokens)
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => api.post('/auth/logout/', { refresh: tokens?.refresh }),
    onSettled: () => {
      logout()
      qc.clear()
      navigate('/login')
    },
  })
}

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/auth/me/').then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10,
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api.post('/auth/forgot-password/', { email }),
    onSuccess: () => toast.success('Reset link sent if email exists'),
    onError: () => toast.error('Something went wrong'),
  })
}

export function useResetPassword() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (data: { token: string; new_password: string; confirm_password: string }) =>
      api.post('/auth/reset-password/', data),
    onSuccess: () => {
      toast.success('Password reset successfully')
      navigate('/login')
    },
    onError: () => toast.error('Invalid or expired token'),
  })
}

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser)
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<User>) => api.patch<User>('/auth/me/', data).then((r) => r.data),
    onSuccess: (user) => {
      setUser(user)
      qc.invalidateQueries({ queryKey: ['me'] })
      toast.success('Profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })
}
