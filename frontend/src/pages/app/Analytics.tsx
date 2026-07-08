import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  Activity, BarChart3, BookOpen, Calendar, CheckCircle2, Clock, Flame,
  HeartPulse, Library, PlaySquare, Target, TrendingUp, Trophy, Zap,
} from 'lucide-react'
import { Badge, Card, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const PIE_COLORS = ['oklch(55% 0.26 290)', 'oklch(70% 0.18 162)', 'oklch(72% 0.18 210)', 'oklch(75% 0.18 80)']

function buildHeatmapData(activityMap: Record<string, number>) {
  const weeks: { date: string; count: number }[][] = []
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 364)
  start.setDate(start.getDate() - start.getDay())

  let week: { date: string; count: number }[] = []
  const cur = new Date(start)
  while (cur <= today) {
    const key = cur.toISOString().split('T')[0]
    week.push({ date: key, count: activityMap[key] ?? 0 })
    if (week.length === 7) { weeks.push(week); week = [] }
    cur.setDate(cur.getDate() + 1)
  }
  if (week.length) weeks.push(week)
  return weeks
}

function heatColor(count: number) {
  if (count === 0) return 'bg-[var(--surface-2)]'
  if (count === 1) return 'bg-primary-200 dark:bg-primary-900/50'
  if (count === 2) return 'bg-primary-300 dark:bg-primary-800/70'
  if (count <= 4) return 'bg-primary-400 dark:bg-primary-600'
  return 'bg-primary-500'
}

function scoreTone(score: number) {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 55) return 'text-amber-500'
  return 'text-rose-500'
}

function StatCard({ icon: Icon, label, value, hint, color, bg }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', bg)}>
          <Icon size={18} className={color} />
        </div>
        <div className="min-w-0">
          <p className="font-display text-xl font-bold text-[var(--text-1)]">{value}</p>
          <p className="truncate text-xs text-[var(--text-3)]">{label}</p>
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-[var(--text-3)]">{hint}</p>}
    </Card>
  )
}

export default function Analytics() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'dashboard' | 'quizzes' | 'heatmap'>('dashboard')

  useEffect(() => {
    api.get('/api/analytics/student/')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const activityMap = data?.activity_map ?? {}
  const heatmapWeeks = useMemo(() => buildHeatmapData(activityMap), [activityMap])
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = []
    heatmapWeeks.forEach((week, wi) => {
      const firstDay = week[0]
      if (!firstDay) return
      const d = new Date(firstDay.date)
      if (d.getDate() <= 7) labels.push({ label: MONTHS[d.getMonth()], col: wi })
    })
    return labels
  }, [heatmapWeeks])

  const health = data?.health_score ?? 0
  const streak = data?.streak_dashboard ?? {}
  const stats = [
    { label: 'Study Hours', value: data?.total_study_hours ?? '-', icon: Clock, color: 'text-cyan-500', bg: 'bg-cyan-400/10', hint: 'Tracked study time' },
    { label: 'Quiz Average', value: `${data?.avg_quiz_score ?? 0}%`, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-400/10', hint: `${data?.quiz_history?.length ?? 0} quiz attempts` },
    { label: 'Current Streak', value: `${data?.streak ?? 0}d`, icon: Flame, color: 'text-amber-500', bg: 'bg-amber-400/10', hint: `Longest ${data?.longest_streak ?? 0} days` },
    { label: 'AI Sessions', value: data?.total_sessions ?? 0, icon: Zap, color: 'text-primary-500', bg: 'bg-primary-100 dark:bg-primary-900/30', hint: 'Tutor conversations' },
  ]

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-7xl space-y-6">
      <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse size={24} className="text-primary-500" />
            <h2 className="font-display text-2xl font-bold text-[var(--text-1)]">Dashboard</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--text-2)]">Streaks, learning health, activity, and performance in one place</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
          {(['dashboard', 'quizzes', 'heatmap'] as const).map(item => (
            <button key={item} onClick={() => setTab(item)}
              className={cn('rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                tab === item ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-1)]')}>
              {item}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Skeleton className="h-72 rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        </div>
      ) : (
        <>
          <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">Learning Health</p>
                  <p className={cn('font-display text-5xl font-bold', scoreTone(health))}>{health}</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10">
                  <HeartPulse size={28} className={scoreTone(health)} />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ['Quiz health', data?.quiz_health ?? 0],
                  ['Activity', data?.activity_health ?? 0],
                  ['Tasks', data?.task_completion ?? 0],
                  ['Documents', data?.document_health ?? 0],
                ].map(([label, value]: any) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-xs text-[var(--text-3)]"><span>{label}</span><span>{value}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${Math.min(100, value)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
            </div>
          </motion.div>

          {tab === 'dashboard' && (
            <motion.div variants={fadeUp} className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <h3 className="mb-4 font-display font-semibold text-[var(--text-1)]">Weekly Activity</h3>
                  {(data?.weekly_activity ?? []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data.weekly_activity} barSize={22}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                        <Bar dataKey="sessions" fill="oklch(55% 0.26 290)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart icon={BarChart3} text="No weekly activity yet" />}
                </Card>

                <Card className="p-5">
                  <h3 className="mb-4 font-display font-semibold text-[var(--text-1)]">Subject Mastery</h3>
                  {(data?.subject_mastery ?? []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={data.subject_mastery}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
                        <Radar dataKey="score" stroke="oklch(55% 0.26 290)" fill="oklch(55% 0.26 290)" fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart icon={BookOpen} text="Take quizzes to build subject mastery" />}
                </Card>

                <Card className="p-5">
                  <h3 className="mb-4 font-display font-semibold text-[var(--text-1)]">Activity Mix</h3>
                  {(data?.activity_mix ?? []).some((item: any) => item.value > 0) ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={data.activity_mix} dataKey="value" nameKey="name" innerRadius={54} outerRadius={86} paddingAngle={3}>
                          {data.activity_mix.map((_: any, index: number) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart icon={Activity} text="No activity mix yet" />}
                </Card>

                <Card className="p-5">
                  <h3 className="mb-4 font-display font-semibold text-[var(--text-1)]">Study Assets</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <MiniMetric icon={Library} label="Documents" value={data?.documents_count ?? 0} />
                    <MiniMetric icon={CheckCircle2} label="Indexed" value={data?.indexed_documents ?? 0} />
                    <MiniMetric icon={PlaySquare} label="Videos" value={data?.saved_videos ?? 0} />
                    <MiniMetric icon={Trophy} label="Tasks Done" value={`${data?.completed_tasks ?? 0}/${data?.planner_tasks ?? 0}`} />
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display font-semibold text-[var(--text-1)]">Streaks</h3>
                    <Badge color={streak.today_active ? 'emerald' : 'amber'}>{streak.today_active ? 'Active today' : 'Not yet today'}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniMetric icon={Flame} label="Current" value={`${streak.current ?? 0}d`} />
                    <MiniMetric icon={TrendingUp} label="Longest" value={`${streak.longest ?? 0}d`} />
                    <MiniMetric icon={Calendar} label="This Week" value={`${streak.weekly_active_days ?? 0}/${streak.weekly_goal ?? 5}`} />
                  </div>
                </Card>

                <Card className="p-5">
                  <h3 className="mb-3 font-display font-semibold text-[var(--text-1)]">Insights</h3>
                  <div className="space-y-2">
                    {(data?.insights ?? []).map((insight: any, index: number) => (
                      <div key={index} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                        <Badge color={insight.color ?? 'primary'}>{insight.title}</Badge>
                        <p className="mt-2 text-xs leading-relaxed text-[var(--text-2)]">{insight.body}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5">
                  <h3 className="mb-3 font-display font-semibold text-[var(--text-1)]">Recent Activity</h3>
                  <div className="space-y-2">
                    {(data?.recent_activity ?? []).length > 0 ? data.recent_activity.map((item: any) => (
                      <div key={item.date} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2">
                        <span className="text-sm text-[var(--text-2)]">{item.date}</span>
                        <span className="text-sm font-semibold text-[var(--text-1)]">{item.events}</span>
                      </div>
                    )) : <p className="py-4 text-center text-sm text-[var(--text-3)]">No recent activity yet</p>}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {tab === 'quizzes' && (
            <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <Card className="p-5">
                <h3 className="mb-4 font-display font-semibold text-[var(--text-1)]">Quiz Score History</h3>
                {(data?.quiz_history ?? []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.quiz_history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                      <Line type="monotone" dataKey="score" stroke="oklch(55% 0.26 290)" strokeWidth={2} dot={{ r: 4, fill: 'oklch(55% 0.26 290)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyChart icon={Target} text="No quiz history yet" />}
              </Card>

              <Card className="p-5">
                <h3 className="mb-4 font-display font-semibold text-[var(--text-1)]">Recent Quizzes</h3>
                <div className="space-y-2">
                  {(data?.quiz_history ?? []).slice(-8).reverse().map((quiz: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 rounded-xl bg-[var(--surface-2)] p-3">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold',
                        quiz.score >= 80 ? 'bg-emerald-400/10 text-emerald-500' :
                        quiz.score >= 60 ? 'bg-amber-400/10 text-amber-500' : 'bg-rose-400/10 text-rose-500')}>
                        {quiz.score}%
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-1)]">{quiz.title || `Quiz ${index + 1}`}</p>
                        <p className="text-xs text-[var(--text-3)]">{quiz.date} - {quiz.questions} questions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {tab === 'heatmap' && (
            <motion.div variants={fadeUp}>
              <Card className="p-5">
                <div className="mb-5 flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--text-2)]" />
                  <h3 className="font-display font-semibold text-[var(--text-1)]">Activity Heatmap</h3>
                  <span className="ml-auto text-xs text-[var(--text-3)]">{data?.total_active_events ?? 0} total events</span>
                </div>
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    <div className="mb-1 flex" style={{ paddingLeft: 28 }}>
                      {heatmapWeeks.map((_, wi) => {
                        const label = monthLabels.find(m => m.col === wi)
                        return <div key={wi} className="mr-0.5 w-3 shrink-0">{label && <span className="whitespace-nowrap text-[9px] text-[var(--text-3)]">{label.label}</span>}</div>
                      })}
                    </div>
                    <div className="flex gap-0.5">
                      <div className="mr-1 flex shrink-0 flex-col gap-0.5">
                        {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, i) => (
                          <div key={i} className="flex h-3 items-center"><span className="w-6 text-right text-[9px] text-[var(--text-3)]">{day}</span></div>
                        ))}
                      </div>
                      {heatmapWeeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-0.5">
                          {week.map((day, di) => (
                            <div key={di} title={`${day.date}: ${day.count} event${day.count !== 1 ? 's' : ''}`} className={cn('h-3 w-3 rounded-sm', heatColor(day.count))} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  )
}

function EmptyChart({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
      <Icon size={30} className="text-[var(--text-3)]" />
      <p className="text-sm text-[var(--text-2)]">{text}</p>
    </div>
  )
}

function MiniMetric({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <Icon size={16} className="mb-2 text-primary-500" />
      <p className="font-display text-lg font-bold text-[var(--text-1)]">{value}</p>
      <p className="text-xs text-[var(--text-3)]">{label}</p>
    </div>
  )
}
