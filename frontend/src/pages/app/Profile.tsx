import { useState, useEffect, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Edit3, Save, X, GraduationCap, MapPin, Star, Mail, CheckCircle2, AlertCircle, RefreshCw, Shield } from 'lucide-react'
import { Card, Badge, Button, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../store/authStore'
import { auth } from '../../lib/firebase'
import {
  sendEmailVerification,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  type User as FirebaseUser,
} from 'firebase/auth'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

function Field({ label, value, name, onChange, type = 'text' }: {
  label: string; value: string; name: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--text-3)] block mb-1">{label}</label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors"
      />
    </div>
  )
}

export default function Profile() {
  const { user: authUser } = useAuth()
  const [profile,  setProfile]  = useState<any>(null)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const [loading,  setLoading]  = useState(true)

  // Firebase email verification state
  const [fbUser,        setFbUser]        = useState<FirebaseUser | null>(null)
  const [fbLoading,     setFbLoading]     = useState(true)
  const [sendingVerify, setSendingVerify] = useState(false)
  const [verifySent,    setVerifySent]    = useState(false)
  const [verifyError,   setVerifyError]   = useState('')
  const [checkingVerify,setCheckingVerify]= useState(false)

  const [form, setForm] = useState({
    first_name: '', last_name: '', avatar: '',
    bio: '', university: '', major: '', department: '',
    gpa: '', current_semester: '', usn: '',
  })

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setFbUser(user)
      setFbLoading(false)
    })
    return unsub
  }, [])

  // Sign into Firebase silently using stored credentials so we can send verification
  async function ensureFirebaseUser() {
    if (fbUser) return fbUser
    // Try to sign in with the current user's email — requires password
    // We'll prompt if needed; for now just return null
    return null
  }

  useEffect(() => {
    api.get('/api/auth/me/')
      .then(r => {
        const d = r.data
        setProfile(d)
        const sp = d.student_profile ?? {}
        setForm({
          first_name:       d.first_name ?? '',
          last_name:        d.last_name ?? '',
          avatar:           d.avatar ?? '',
          bio:              sp.bio ?? '',
          university:       sp.university ?? '',
          major:            sp.major ?? '',
          department:       sp.department ?? '',
          gpa:              sp.gpa ?? '',
          current_semester: sp.current_semester ?? '',
          usn:              sp.usn ?? '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    try {
      const payload: any = {
        first_name: form.first_name,
        last_name:  form.last_name,
        avatar:     form.avatar || undefined,
        student_profile: {
          bio:              form.bio,
          university:       form.university,
          major:            form.major,
          department:       form.department,
          gpa:              form.gpa ? parseFloat(form.gpa) : null,
          current_semester: form.current_semester ? parseInt(form.current_semester) : 1,
          usn:              form.usn || null,
        },
      }
      const r = await api.patch('/api/auth/me/', payload)
      setProfile(r.data)
      useAuth.setState(s => ({ user: { ...s.user!, ...r.data } }))
      setSuccess('Profile updated!')
      setEditing(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      const d = err?.response?.data
      setError(typeof d === 'string' ? d : JSON.stringify(d) || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function sendVerificationEmail() {
    setVerifyError(''); setSendingVerify(true)
    try {
      if (!fbUser) {
        // Firebase user not signed in — use the API to trigger verification instead
        await api.post('/api/auth/send-verification/')
        setVerifySent(true)
        return
      }
      await sendEmailVerification(fbUser, { url: `${window.location.origin}/app/profile` })
      setVerifySent(true)
    } catch (err: any) {
      const code = err?.code ?? ''
      if (code === 'auth/too-many-requests') setVerifyError('Too many requests. Wait a few minutes.')
      else setVerifyError('Could not send verification email. Try again.')
    } finally {
      setSendingVerify(false)
    }
  }

  async function checkVerificationStatus() {
    setCheckingVerify(true)
    try {
      if (fbUser) {
        await fbUser.reload()
        const refreshed = auth.currentUser
        if (refreshed?.emailVerified) {
          // Update backend
          await api.patch('/api/auth/me/', { is_verified: true }).catch(() => {})
          setProfile((p: any) => ({ ...p, is_verified: true }))
          useAuth.setState(s => ({ user: s.user ? { ...s.user, is_verified: true } : s.user }))
          setVerifySent(false)
        } else {
          setVerifyError('Email not verified yet. Check your inbox.')
        }
      } else {
        // Fallback: check via backend
        const r = await api.get('/api/auth/me/')
        if (r.data.is_verified) {
          setProfile(r.data)
          useAuth.setState(s => ({ user: s.user ? { ...s.user, is_verified: true } : s.user }))
          setVerifySent(false)
        } else {
          setVerifyError('Email not verified yet. Check your inbox.')
        }
      }
    } finally {
      setCheckingVerify(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[0,1,2].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const sp       = profile?.student_profile ?? {}
  const xp       = sp.xp ?? 0
  const level    = sp.level ?? 1
  const xpToNext = level * 1000
  const xpPct    = Math.min(100, Math.round((xp / xpToNext) * 100))
  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase() || '?'
  const isVerified = profile?.is_verified || fbUser?.emailVerified

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-4xl">
      {success && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 text-sm">
          {success}
        </div>
      )}

      {/* Email Verification Banner */}
      {!isVerified && !fbLoading && (
        <motion.div variants={fadeUp}>
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-400/10 border border-amber-400/30">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Email not verified</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                Verify your email to unlock all features and secure your account.
              </p>
              {verifyError && <p className="text-xs text-rose-500 mt-1">{verifyError}</p>}
              {verifySent && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  ✓ Verification email sent to <strong>{profile?.email}</strong>. Check your inbox.
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {verifySent && (
                <button
                  onClick={checkVerificationStatus}
                  disabled={checkingVerify}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-60"
                >
                  <RefreshCw size={12} className={checkingVerify ? 'animate-spin' : ''} />
                  {checkingVerify ? 'Checking…' : 'I verified'}
                </button>
              )}
              <button
                onClick={sendVerificationEmail}
                disabled={sendingVerify}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60"
              >
                <Mail size={12} />
                {sendingVerify ? 'Sending…' : verifySent ? 'Resend' : 'Send verification'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Verified badge */}
      {isVerified && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-400/10 border border-emerald-400/30">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Email verified</p>
            <Shield size={14} className="text-emerald-500 ml-auto" />
          </div>
        </motion.div>
      )}

      {/* Hero */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden">
          <div className="h-28 bg-gradient-primary relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 0%, transparent 60%)' }} />
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative">
                {profile?.avatar
                  ? <img src={profile.avatar} alt={profile.first_name} className="w-20 h-20 rounded-2xl border-4 border-[var(--surface)] shadow-glass object-cover" />
                  : <div className="w-20 h-20 rounded-2xl border-4 border-[var(--surface)] shadow-glass bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold">{initials}</div>
                }
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-primary border-2 border-[var(--surface)] flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">{level}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isVerified && (
                  <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                    <CheckCircle2 size={13} /> Verified
                  </span>
                )}
                <Button variant="secondary" size="sm" className="gap-2" onClick={() => setEditing(e => !e)}>
                  {editing ? <><X size={14} /> Cancel</> : <><Edit3 size={14} /> Edit Profile</>}
                </Button>
              </div>
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                {error && <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="First Name"       name="first_name"       value={form.first_name}       onChange={handleChange} />
                  <Field label="Last Name"        name="last_name"        value={form.last_name}        onChange={handleChange} />
                  <Field label="University"       name="university"       value={form.university}       onChange={handleChange} />
                  <Field label="Major"            name="major"            value={form.major}            onChange={handleChange} />
                  <Field label="Department"       name="department"       value={form.department}       onChange={handleChange} />
                  <Field label="USN / Student ID" name="usn"              value={form.usn}              onChange={handleChange} />
                  <Field label="GPA"              name="gpa"              value={form.gpa}              onChange={handleChange} type="number" />
                  <Field label="Current Semester" name="current_semester" value={form.current_semester} onChange={handleChange} type="number" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-3)] block mb-1">Avatar URL</label>
                  <input name="avatar" value={form.avatar} onChange={handleChange}
                    placeholder="https://…"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-3)] block mb-1">Bio</label>
                  <textarea name="bio" value={form.bio} onChange={handleChange as any} rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="gradient" size="sm" className="gap-2" disabled={saving}>
                    <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold text-[var(--text-1)]">
                  {profile?.first_name} {profile?.last_name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-[var(--text-2)]">
                  {sp.major      && <span className="flex items-center gap-1"><GraduationCap size={14} /> {sp.major}</span>}
                  {sp.university && <span className="flex items-center gap-1"><MapPin size={14} /> {sp.university}</span>}
                  {sp.gpa        && <span className="flex items-center gap-1"><Star size={14} className="text-amber-400" /> GPA {sp.gpa}</span>}
                </div>
                {sp.bio && <p className="text-sm text-[var(--text-2)] mt-3 max-w-lg">{sp.bio}</p>}

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-[var(--text-3)] mb-1.5">
                    <span>Level {level} · {xp.toLocaleString()} XP</span>
                    <span>{xpToNext.toLocaleString()} XP to Level {level + 1}</span>
                  </div>
                  <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-gradient-primary rounded-full"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Info cards */}
      {!editing && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <h3 className="font-display font-semibold text-[var(--text-1)] mb-3">Account</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-3)]">Email</span>
                <span className="text-[var(--text-1)] truncate ml-2 text-xs">{profile?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-3)]">Role</span>
                <Badge color="primary" className="capitalize">{profile?.role}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-3)]">Email</span>
                {isVerified
                  ? <Badge color="emerald"><CheckCircle2 size={10} className="inline mr-1" />Verified</Badge>
                  : <Badge color="amber">Unverified</Badge>
                }
              </div>
              {sp.usn && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">USN</span>
                  <span className="text-[var(--text-1)]">{sp.usn}</span>
                </div>
              )}
              {sp.current_semester && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">Semester</span>
                  <span className="text-[var(--text-1)]">{sp.current_semester}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold text-[var(--text-1)] mb-3">Study Stats</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'XP',     value: xp.toLocaleString() },
                { label: 'Level',  value: level },
                { label: 'Streak', value: `${sp.streak ?? 0} days` },
              ].map(s => (
                <div key={s.label} className="flex justify-between">
                  <span className="text-[var(--text-3)]">{s.label}</span>
                  <span className="font-semibold text-[var(--text-1)]">{s.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold text-[var(--text-1)] mb-3">Skills</h3>
            {sp.skills?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {sp.skills.map((s: string) => <Badge key={s} color="primary">{s}</Badge>)}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-3)]">No skills added yet.</p>
            )}
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
