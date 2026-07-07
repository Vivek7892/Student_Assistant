import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Logo } from '../../components/ui/Logo'
import { firebaseSendReset } from '../../lib/firebase'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await firebaseSendReset(email)
      setSent(true)
    } catch (err: any) {
      const code = err?.code ?? ''
      if (code === 'auth/user-not-found')   setError('No account found with this email.')
      else if (code === 'auth/invalid-email') setError('Invalid email address.')
      else setError('Failed to send reset email. Try again.')
    } finally {
      setLoading(false)
    }
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
            <h2 className="font-display font-semibold text-lg text-[var(--text-1)]">Reset password</h2>
            <p className="text-sm text-[var(--text-3)] mt-0.5">We'll send a reset link to your email</p>
          </div>

          {sent ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-[var(--text-1)]">Check your inbox</p>
              <p className="text-xs text-[var(--text-3)]">
                A password reset link was sent to <strong>{email}</strong>
              </p>
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
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-primary text-white font-semibold text-sm hover:shadow-lift transition-all disabled:opacity-60">
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          <Link to="/login" className="flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
