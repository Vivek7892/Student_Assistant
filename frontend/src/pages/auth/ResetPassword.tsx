import { useState, FormEvent } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Logo } from '../../components/ui/Logo'
import { firebaseConfirmReset } from '../../lib/firebase'

export default function ResetPassword() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const oobCode     = params.get('oobCode') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    setError('')
    setLoading(true)
    try {
      await firebaseConfirmReset(oobCode, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      const code = err?.code ?? ''
      if (code === 'auth/expired-action-code') setError('Reset link has expired. Request a new one.')
      else if (code === 'auth/invalid-action-code') setError('Invalid reset link.')
      else setError('Failed to reset password. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!oobCode) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-6 text-center space-y-3 max-w-sm w-full">
          <p className="text-sm text-rose-500">Invalid or missing reset link.</p>
          <Link to="/forgot-password" className="text-sm text-[var(--primary)] hover:underline">Request a new one</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8 gap-3">
          <Logo size={48} />
          <h1 className="font-display font-bold text-2xl text-[var(--text-1)]">StudyBuddy</h1>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-[var(--text-1)]">New password</h2>
            <p className="text-sm text-[var(--text-3)] mt-0.5">Choose a strong password</p>
          </div>

          {done ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-[var(--text-1)]">Password updated!</p>
              <p className="text-xs text-[var(--text-3)]">Redirecting to sign in…</p>
            </motion.div>
          ) : (
            <>
              {error && (
                <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                  <input
                    type={showPw ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="New password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)]">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                  <input
                    type={showPw ? 'text' : 'password'} required value={confirm}
                    onChange={e => setConfirm(e.target.value)} placeholder="Confirm password"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-primary text-white font-semibold text-sm hover:shadow-lift transition-all disabled:opacity-60">
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
