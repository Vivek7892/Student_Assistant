import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Flame, Target, Clock, Bot, ArrowRight, FileText, BookOpen, Zap, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, Badge, Button, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../store/authStore'
import { cn } from '../../lib/utils'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const firstName = user?.first_name || user?.full_name?.split(' ')[0] || 'there'

  const [analytics, setAnalytics] = useState<any>(null)
  const [sessions,  setSessions]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/analytics/student/').catch(() => ({ data: null })),
      api.get('/api/ai/sessions/').catch(() => ({ data: [] })),
    ]).then(([a, s]) => {
      setAnalytics(a.data)
      setSessions(Array.isArray(s.data) ? s.data : s.data?.results ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const kpis = [
    { label: 'AI Sessions',   value: analytics?.total_sessions   ?? sessions.length, unit: '',    icon: Bot,    color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-500' },
    { label: 'Quiz Accuracy', value: analytics?.avg_quiz_score   ?? '—',             unit: '%',   icon: Target, color: 'bg-emerald-400/10 text-emerald-500' },
    { label: 'Study Hours',   value: analytics?.total_study_hours ?? '—',            unit: 'hrs', icon: Clock,  color: 'bg-cyan-400/10 text-cyan-500' },
    { label: 'Streak',        value: user?.student_profile?.streak ?? 0,             unit: 'd',   icon: Flame,  color: 'bg-amber-400/10 text-amber-500' },
  ]

  const progressData = analytics?.monthly_progress ?? analytics?.quiz_history ?? []

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-7xl">
      <motion.div variants={fadeUp}>
        <h2 className="font-display text-2xl font-bold text-[var(--text-1)]">
          {greeting()}, {firstName} 👋
        </h2>
        <p className="text-sm text-[var(--text-2)] mt-1">Welcome back — let's keep learning!</p>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          : kpis.map(k => (
            <Card key={k.label} className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[var(--text-3)] font-medium">{k.label}</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-[var(--text-1)] mt-1">
                    {k.value}<span className="text-xs sm:text-sm font-normal text-[var(--text-3)] ml-1">{k.unit}</span>
                  </p>
                </div>
                <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center', k.color)}>
                  <k.icon size={16} />
                </div>
              </div>
            </Card>
          ))
        }
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Progress chart */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-[var(--text-1)]">Learning Progress</h3>
            <Badge color="primary">This semester</Badge>
          </div>
          {loading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : progressData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="oklch(55% 0.26 290)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(55% 0.26 290)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="score" stroke="oklch(55% 0.26 290)" strokeWidth={2} fill="url(#grad)" name="Score" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-center">
              <BookOpen size={28} className="text-[var(--text-3)]" />
              <p className="text-sm text-[var(--text-2)]">No progress data yet</p>
              <p className="text-xs text-[var(--text-3)]">Start studying to see your progress here</p>
            </div>
          )}
        </Card>

        {/* Recent AI sessions */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-[var(--text-1)]">Recent Chats</h3>
            <Link to="/app/ai">
              <Button variant="ghost" size="sm" className="text-xs gap-1">View all <ArrowRight size={12} /></Button>
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <p className="text-sm text-[var(--text-2)]">No chats yet</p>
              <Link to="/app/ai">
                <Button variant="gradient" size="sm" className="gap-1.5"><Plus size={13} /> Start chatting</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 5).map(s => (
                <Link key={s.id} to="/app/ai" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                    <Bot size={13} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text-1)] truncate">{s.title || 'Untitled'}</p>
                    <p className="text-xs text-[var(--text-3)]">{new Date(s.updated_at).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={fadeUp}>
        <Card className="p-5">
          <h3 className="font-display font-semibold text-[var(--text-1)] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Ask AI Tutor',      icon: Bot,      to: '/app/ai',        color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-500' },
              { label: 'Upload Document',   icon: FileText, to: '/app/documents', color: 'bg-rose-400/10 text-rose-500' },
              { label: 'Study Flashcards',  icon: Zap,      to: '/app/flashcards',color: 'bg-amber-400/10 text-amber-500' },
              { label: 'Take a Quiz',       icon: Target,   to: '/app/quizzes',   color: 'bg-emerald-400/10 text-emerald-500' },
            ].map(a => (
              <Link key={a.label} to={a.to}
                className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors text-center"
              >
                <div className={cn('w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center', a.color)}>
                  <a.icon size={16} />
                </div>
                <p className="text-xs font-medium text-[var(--text-1)] leading-tight">{a.label}</p>
              </Link>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
