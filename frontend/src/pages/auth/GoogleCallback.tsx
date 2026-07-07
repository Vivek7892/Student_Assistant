import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../store/authStore'
import { Logo } from '../../components/ui/Logo'

const API = (import.meta as any).env?.VITE_API_URL ?? ''

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError('Google sign-in was cancelled.')
      setTimeout(() => navigate('/login'), 2000)
      return
    }

    if (!code) {
      navigate('/login')
      return
    }

    fetch(`${API}/api/auth/google/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirect_uri: `${window.location.origin}/auth/google/callback`,
      }),
    })
      .then(async res => {
        const text = await res.text()
        const data = text ? JSON.parse(text) : {}
        if (!res.ok) throw new Error(data.error || `Google sign-in failed (${res.status})`)
        return data
      })
      .then(data => {
        useAuth.setState({ token: data.tokens.access, refreshToken: data.tokens.refresh, user: data.user, isAuthenticated: true })
        const role = data.user?.role
        if (role === 'admin') navigate('/admin')
        else navigate('/app')
      })
      .catch(err => {
        setError(err.message)
        setTimeout(() => navigate('/login'), 3000)
      })
  }, [])

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Logo size={48} />
        {error ? (
          <p className="text-rose-500 text-sm">{error}</p>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--text-2)]">Signing you in with Google…</p>
          </>
        )}
      </div>
    </div>
  )
}
