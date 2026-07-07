import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, Bell, Bot, Shield, Palette, LogOut } from 'lucide-react'
import { Card, Button, Badge } from '../../components/ui'
import { useTheme } from '../../store/themeStore'
import { useAuth } from '../../store/authStore'
import { api } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={cn('relative rounded-full transition-colors', checked ? 'bg-primary-500' : 'bg-[var(--border)]')}
      style={{ width: 40, height: 22 }}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-primary-500" />
        <h3 className="font-display font-semibold text-[var(--text-1)]">{title}</h3>
      </div>
      {children}
    </Card>
  )
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
      <div>
        <p className="text-sm font-medium text-[var(--text-1)]">{label}</p>
        {description && <p className="text-xs text-[var(--text-3)] mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { dark, toggle } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [notifs, setNotifs] = useState({ deadlines: true, streaks: true, grades: true, ai: false })
  const [ai,     setAi]     = useState({ contextual: true, suggestions: true, autoSummarize: false })
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [pwMsg,  setPwMsg]  = useState('')
  const [pwErr,  setPwErr]  = useState('')

  async function changePassword() {
    if (pwForm.new_password !== pwForm.confirm) { setPwErr('Passwords do not match'); return }
    if (pwForm.new_password.length < 8) { setPwErr('Password must be at least 8 characters'); return }
    setPwErr(''); setPwMsg('')
    try {
      await api.post('/api/auth/change-password/', {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      })
      setPwMsg('Password changed successfully!')
      setPwForm({ old_password: '', new_password: '', confirm: '' })
    } catch (err: any) {
      setPwErr(err?.response?.data?.old_password?.[0] ?? err?.response?.data?.detail ?? 'Failed to change password')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-2xl">
      <h2 className="font-display text-xl font-bold text-[var(--text-1)]">Settings</h2>

      <Section title="Appearance" icon={Palette}>
        <Row label="Dark Mode" description="Switch between light and dark theme">
          <div className="flex items-center gap-2">
            <Sun size={14} className="text-[var(--text-3)]" />
            <Toggle checked={dark} onChange={toggle} />
            <Moon size={14} className="text-[var(--text-3)]" />
          </div>
        </Row>
      </Section>

      <Section title="Notifications" icon={Bell}>
        {(Object.keys(notifs) as (keyof typeof notifs)[]).map(key => (
          <Row key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} description={`Receive ${key} notifications`}>
            <Toggle checked={notifs[key]} onChange={() => setNotifs(n => ({ ...n, [key]: !n[key] }))} />
          </Row>
        ))}
      </Section>

      <Section title="AI Assistant" icon={Bot}>
        <Row label="Contextual Awareness" description="AI reads your current page context">
          <Toggle checked={ai.contextual} onChange={() => setAi(a => ({ ...a, contextual: !a.contextual }))} />
        </Row>
        <Row label="Smart Suggestions" description="Show AI suggestions on dashboard">
          <Toggle checked={ai.suggestions} onChange={() => setAi(a => ({ ...a, suggestions: !a.suggestions }))} />
        </Row>
        <Row label="Auto-Summarize" description="Automatically summarize uploaded documents">
          <Toggle checked={ai.autoSummarize} onChange={() => setAi(a => ({ ...a, autoSummarize: !a.autoSummarize }))} />
        </Row>
      </Section>

      <Section title="Account" icon={Shield}>
        <Row label="Email" description={user?.email ?? '—'}>
          <Badge color="primary">{user?.role}</Badge>
        </Row>
        <Row label="Verified" description="Email verification status">
          <Badge color={user?.is_verified ? 'emerald' : 'rose'}>{user?.is_verified ? 'Verified' : 'Unverified'}</Badge>
        </Row>

        {/* Change password */}
        <div className="pt-2 space-y-2">
          <p className="text-sm font-medium text-[var(--text-1)]">Change Password</p>
          {pwErr && <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{pwErr}</p>}
          {pwMsg && <p className="text-xs text-emerald-500 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">{pwMsg}</p>}
          {['old_password', 'new_password', 'confirm'].map(field => (
            <input
              key={field}
              type="password"
              placeholder={field === 'old_password' ? 'Current password' : field === 'new_password' ? 'New password' : 'Confirm new password'}
              value={(pwForm as any)[field]}
              onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
          ))}
          <Button variant="secondary" size="sm" onClick={changePassword}>Update Password</Button>
        </div>

        <div className="pt-2 border-t border-[var(--border)]">
          <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 gap-2 w-full justify-start" onClick={handleLogout}>
            <LogOut size={14} /> Sign out
          </Button>
        </div>
      </Section>
    </motion.div>
  )
}
