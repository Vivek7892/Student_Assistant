import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../store/authStore'

// ── ErrorBoundary ─────────────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <p className="text-2xl">⚠️</p>
          <p className="font-display font-semibold text-[var(--text-1)]">Something went wrong</p>
          <p className="text-sm text-[var(--text-3)]">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── ProtectedRoute ────────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: Array<'student' | 'teacher' | 'admin'>
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/app" replace />

  return <>{children}</>
}
