import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  allowedRoles?: string[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const redirectMap: Record<string, string> = { student: '/student', teacher: '/teacher', admin: '/admin' }
    return <Navigate to={redirectMap[user.role] || '/'} replace />
  }

  return <Outlet />
}
