import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Users, MessageSquare, Zap, FileText, Shield } from 'lucide-react'
import { Card, Badge, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const PIE_COLORS = ['oklch(55% 0.26 290)', 'oklch(70% 0.20 162)', 'oklch(75% 0.20 80)']

export default function AdminDashboard() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/analytics/admin/')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const stats = data?.stats
  const kpis = [
    { label: 'Total Users',       value: stats?.total_users        ?? '—', icon: Users,         color: 'text-primary-500', bg: 'bg-primary-100 dark:bg-primary-900/30' },
    { label: 'Study Materials',   value: stats?.total_materials    ?? '—', icon: FileText,      color: 'text-emerald-500', bg: 'bg-emerald-400/10' },
    { label: 'AI Chat Sessions',  value: stats?.total_chat_sessions ?? '—', icon: MessageSquare, color: 'text-cyan-500',    bg: 'bg-cyan-400/10'    },
    { label: 'AI Requests Today', value: stats?.ai_requests_today  ?? '—', icon: Zap,           color: 'text-amber-500',   bg: 'bg-amber-400/10'   },
  ]

  const usersByRole = (data?.users_by_role ?? []).map((r: any, i: number) => ({
    name:  r.role.charAt(0).toUpperCase() + r.role.slice(1),
    value: r.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const materialsByType = (data?.materials_by_type ?? []).map((m: any) => ({
    type:  m.material_type.charAt(0).toUpperCase() + m.material_type.slice(1),
    count: m.count,
  }))

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-7xl">
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--text-1)]">Admin Dashboard</h2>
          <p className="text-sm text-[var(--text-2)]">Platform overview & management</p>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          : kpis.map(s => (
            <Card key={s.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[var(--text-3)] font-medium">{s.label}</p>
                  <p className="font-display text-2xl font-bold text-[var(--text-1)] mt-1">
                    {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                  </p>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                  <s.icon size={18} className={s.color} />
                </div>
              </div>
            </Card>
          ))
        }
      </motion.div>

      {/* Charts */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-display font-semibold text-[var(--text-1)] mb-4">Materials by Type</h3>
          {loading ? <Skeleton className="h-48 rounded-xl" /> : materialsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={materialsByType} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="oklch(55% 0.26 290)" radius={[6, 6, 0, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-[var(--text-3)]">No materials yet</div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold text-[var(--text-1)] mb-4">Users by Role</h3>
          {loading ? <Skeleton className="h-48 rounded-xl" /> : usersByRole.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={usersByRole} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {usersByRole.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {usersByRole.map((r: any) => (
                  <div key={r.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                      <span className="text-[var(--text-2)]">{r.name}</span>
                    </div>
                    <span className="font-semibold text-[var(--text-1)]">{r.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-[var(--text-3)]">No data</div>
          )}
        </Card>
      </motion.div>

      {/* Recent users + recent chats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-[var(--text-1)]">Recent Registrations</h3>
            {stats && <Badge color="primary">{stats.students} students</Badge>}
          </div>
          {loading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : (data?.users ?? []).slice(0, 5).map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                {u.full_name?.[0] ?? u.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-1)] truncate">{u.full_name}</p>
                <p className="text-xs text-[var(--text-3)] truncate">{u.email}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge color="primary">student</Badge>
                <span className="text-xs text-[var(--text-3)]">{u.chat_sessions} chats</span>
              </div>
              {!u.is_verified && <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Unverified" />}
            </div>
          ))}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-[var(--text-1)]">Recent AI Sessions</h3>
            <Badge color="cyan">Live</Badge>
          </div>
          {loading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : (data?.recent_chats ?? []).slice(0, 5).map((c: any) => (
            <div key={c.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
              <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                <MessageSquare size={14} className="text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-1)] truncate">{c.title || 'Untitled'}</p>
                <p className="text-xs text-[var(--text-3)] truncate">{c.user_email}{c.subject_name ? ` · ${c.subject_name}` : ''}</p>
              </div>
              <span className="text-xs text-[var(--text-3)] shrink-0">
                {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : ''}
              </span>
            </div>
          ))}
        </Card>
      </motion.div>
    </motion.div>
  )
}
