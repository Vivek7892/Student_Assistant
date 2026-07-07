import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Lock, Eye, EyeOff, Sun, Moon, ArrowRight } from 'lucide-react'
import { Logo } from '../../components/ui/Logo'
import { useAuth } from '../../store/authStore'
import { useTheme } from '../../store/themeStore'

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ?? ''

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

const slide = {
  enter: { opacity: 0, x: 32 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -32 },
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { dark, toggle } = useTheme()

  const [step, setStep] = useState<1 | 2>(1)
  const [oauthError, setOauthError] = useState('')

  function handleGoogleSignup() {
    if (!GOOGLE_CLIENT_ID) { setOauthError('Google OAuth not configured'); return }
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/app', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
      <button onClick={toggle} className="fixed top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors">
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8 gap-3">
          <Logo size={48} />
          <div className="text-center">
            <h1 className="font-display font-bold text-2xl text-[var(--text-1)]">StudyBuddy</h1>
            <p className="text-sm text-[var(--text-3)] mt-0.5">Your AI-powered learning companion</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5 px-1">
          {[1, 2].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
          ))}
        </div>

        <div className="glass rounded-2xl p-6 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="step1" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                <h2 className="font-display font-semibold text-lg text-[var(--text-1)] mb-1">Get started</h2>
                <p className="text-sm text-[var(--text-3)] mb-4">Create your student account to start learning</p>
                <div className="mb-6" />

                {oauthError && (
                  <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs mb-3">{oauthError}</div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm font-medium text-[var(--text-1)] hover:bg-[var(--surface)] hover:border-[var(--text-3)] transition-all mb-3"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs text-[var(--text-3)]">or</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-primary text-white font-semibold text-sm hover:shadow-lift transition-all"
                >
                  Sign up with email <ArrowRight size={15} />
                </button>

                <p className="text-center text-sm text-[var(--text-3)] mt-4">
                  Already have an account?{' '}
                  <Link to="/login" className="text-[var(--primary)] font-medium hover:underline">Sign in</Link>
                </p>
              </motion.div>
            ) : (
              <motion.div key="step2" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                <button type="button" onClick={() => setStep(1)} className="text-xs text-[var(--text-3)] hover:text-[var(--text-2)] mb-3 flex items-center gap-1">
                  ← Back
                </button>
                <h2 className="font-display font-semibold text-lg text-[var(--text-1)] mb-4">Create your account</h2>

                {error && (
                  <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm mb-3">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                    <input
                      type="text" required value={name} onChange={e => setName(e.target.value)}
                      placeholder="Full name"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                  </div>

                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                  </div>

                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                    <input
                      type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Password (min 8 chars)"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)]">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Password strength */}
                  {password.length > 0 && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= i * 3
                            ? password.length >= 12 ? 'bg-emerald-500' : password.length >= 8 ? 'bg-amber-500' : 'bg-rose-500'
                            : 'bg-[var(--border)]'
                        }`} />
                      ))}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-gradient-primary text-white font-semibold text-sm hover:shadow-lift transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>
                </form>

                <p className="text-center text-xs text-[var(--text-3)] mt-4">
                  By signing up you agree to our{' '}
                  <span className="text-[var(--primary)] cursor-pointer hover:underline">Terms</span> &{' '}
                  <span className="text-[var(--primary)] cursor-pointer hover:underline">Privacy Policy</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
