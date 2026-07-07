import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line,
} from 'recharts'
import { TrendingUp, Clock, Target, Flame, BarChart3, Calendar } from 'lucide-react'
import { Card, Badge, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

// ── Heatmap helpers ──────────────────────────────────────────────────────────
function buildHeatmapData(activityMap: Record<string, number>) {
  const weeks: { date: string; count: number }[][] = []
  const today = new Date()
  // Go back 52 weeks
  const start = new Date(today)
  start.setDate(start.getDate() - 364)
  // Align to Sunday
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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Analytics() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<'overview' | 'quizzes' | 'heatmap'>('overview')

  useEffect(() => {
    api.get('/api/analytics/student/')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Total Study Hours', value: data?.total_study_hours ?? '—', icon: Clock,      color: 'text-cyan-500',    bg: 'bg-cyan-400/10'    },
    { label: 'Avg Quiz Score',    value: data?.avg_quiz_score    ?? '—', icon: Target,     color: 'text-emerald-500', bg: 'bg-emerald-400/10' },
    { label: 'Current Streak',   value: data?.streak            ?? '—', icon: Flame,      color: 'text-amber-500',   bg: 'bg-amber-400/10'   },
    { label: 'AI Sessions',      value: data?.total_sessions    ?? '—', icon: TrendingUp, color: 'text-primary-500', bg: 'bg-primary-100 dark:bg-primary-900/30' },
  ]

  const radarData    = data?.subject_mastery  ?? []
  const weeklyData   = data?.weekly_activity  ?? []
  const quizHistory  = data?.quiz_history     ?? []
  const activityMap  = data?.activity_map     ?? {}
  const heatmapWeeks = buildHeatmapData(activityMap)

  // Month labels for heatmap
  const monthLabels: { label: string; col: number }[] = []
  heatmapWeeks.forEach((week, wi) => {
    const firstDay = week[0]
    if (firstDay) {
      const d = new Date(firstDay.date)
      if (d.getDate() <= 7) {
        monthLabels.push({ label: MONTHS[d.getMonth()], col: wi })
      }
    }
  })

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--text-1)]">Learning Analytics</h2>
          <p className="text-sm text-[var(--text-2)]">Your performance overview</p>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] self-start sm:self-auto">
          {(['overview', 'quizzes', 'heatmap'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                tab === t
                  ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-sm'
                  : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
              )}>
              {t}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stats row — always visible */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          : stats.map(s => (
            <Card key={s.label} className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-[var(--text-1)]">{s.value}</p>
                <p className="text-xs text-[var(--text-3)]">{s.label}</p>
              </div>
            </Card>
          ))
        }
      </motion.div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-display font-semibold text-[var(--text-1)] mb-4">Subject Mastery</h3>
            {loading ? <Skeleton className="h-64 rounded-xl" /> : radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
                  <Radar name="Score" dataKey="score" stroke="oklch(55% 0.26 290)" fill="oklch(55% 0.26 290)" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
                <BarChart3 size={28} className="text-[var(--text-3)]" />
                <p className="text-sm text-[var(--text-2)]">No subject data yet</p>
                <p className="text-xs text-[var(--text-3)]">Take quizzes to see your subject mastery</p>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold text-[var(--text-1)] mb-4">Weekly Activity</h3>
            {loading ? <Skeleton className="h-64 rounded-xl" /> : weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="sessions" fill="oklch(55% 0.26 290)" radius={[6, 6, 0, 0]} name="Sessions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
                <BarChart3 size={28} className="text-[var(--text-3)]" />
                <p className="text-sm text-[var(--text-2)]">No activity data yet</p>
              </div>
            )}
          </Card>

          {data?.insights?.length > 0 && (
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-display font-semibold text-[var(--text-1)] mb-4">AI Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.insights.map((insight: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                    <Badge color={insight.color ?? 'primary'} className="mb-2">{insight.title}</Badge>
                    <p className="text-xs text-[var(--text-2)] leading-relaxed">{insight.body}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {/* ── Quizzes Tab ── */}
      {tab === 'quizzes' && (
        <motion.div variants={fadeUp} className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display font-semibold text-[var(--text-1)] mb-4">Quiz Score History</h3>
            {loading ? <Skeleton className="h-64 rounded-xl" /> : quizHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={quizHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => [`${v}%`, 'Score']}
                  />
                  <Line type="monotone" dataKey="score" stroke="oklch(55% 0.26 290)" strokeWidth={2} dot={{ r: 4, fill: 'oklch(55% 0.26 290)' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
                <Target size={28} className="text-[var(--text-3)]" />
                <p className="text-sm text-[var(--text-2)]">No quiz history yet</p>
                <p className="text-xs text-[var(--text-3)]">Take quizzes to track your progress</p>
              </div>
            )}
          </Card>

          {/* Quiz breakdown table */}
          {quizHistory.length > 0 && (
            <Card className="p-5">
              <h3 className="font-display font-semibold text-[var(--text-1)] mb-4">Recent Quizzes</h3>
              <div className="space-y-2">
                {quizHistory.slice(-10).reverse().map((q: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)]">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                      q.score >= 80 ? 'bg-emerald-400/10 text-emerald-500' :
                      q.score >= 60 ? 'bg-amber-400/10 text-amber-500' :
                                      'bg-rose-400/10 text-rose-500'
                    )}>
                      {q.score}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-1)] truncate">{q.title ?? `Quiz ${i + 1}`}</p>
                      <p className="text-xs text-[var(--text-3)]">{q.date} · {q.questions} questions</p>
                    </div>
                    <Badge color={q.score >= 80 ? 'emerald' : q.score >= 60 ? 'amber' : 'rose'}>
                      {q.score >= 80 ? 'Excellent' : q.score >= 60 ? 'Good' : 'Practice'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {/* ── Heatmap Tab ── */}
      {tab === 'heatmap' && (
        <motion.div variants={fadeUp}>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <Calendar size={16} className="text-[var(--text-2)]" />
              <h3 className="font-display font-semibold text-[var(--text-1)]">Activity Heatmap</h3>
              <span className="text-xs text-[var(--text-3)] ml-auto">
                {Object.values(activityMap as Record<string, number>).reduce((a: number, b: number) => a + b, 0)} total sessions
              </span>
            </div>

            {loading ? <Skeleton className="h-32 rounded-xl" /> : (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  {/* Month labels */}
                  <div className="flex mb-1" style={{ paddingLeft: 28 }}>
                    {heatmapWeeks.map((_, wi) => {
                      const label = monthLabels.find(m => m.col === wi)
                      return (
                        <div key={wi} className="w-3 shrink-0 mr-0.5">
                          {label && <span className="text-[9px] text-[var(--text-3)] whitespace-nowrap">{label.label}</span>}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex gap-0.5">
                    {/* Day labels */}
                    <div className="flex flex-col gap-0.5 mr-1 shrink-0">
                      {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                        <div key={i} className="h-3 flex items-center">
                          <span className="text-[9px] text-[var(--text-3)] w-6 text-right">{d}</span>
                        </div>
                      ))}
                    </div>

                    {/* Cells */}
                    {heatmapWeeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-0.5">
                        {week.map((day, di) => (
                          <div
                            key={di}
                            title={`${day.date}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
                            className={cn('w-3 h-3 rounded-sm transition-colors cursor-default', heatColor(day.count))}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-1.5 mt-3 justify-end">
                    <span className="text-[10px] text-[var(--text-3)]">Less</span>
                    {[0, 1, 2, 3, 5].map(n => (
                      <div key={n} className={cn('w-3 h-3 rounded-sm', heatColor(n))} />
                    ))}
                    <span className="text-[10px] text-[var(--text-3)]">More</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Streak info */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[
              { label: 'Current Streak', value: `${data?.streak ?? 0} days`, color: 'text-amber-500', bg: 'bg-amber-400/10' },
              { label: 'Longest Streak', value: `${data?.longest_streak ?? 0} days`, color: 'text-primary-500', bg: 'bg-primary-100 dark:bg-primary-900/30' },
              { label: 'Active Days',    value: `${Object.keys(activityMap).length}`, color: 'text-emerald-500', bg: 'bg-emerald-400/10' },
            ].map(s => (
              <Card key={s.label} className="p-4 text-center">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2', s.bg)}>
                  <Flame size={18} className={s.color} />
                </div>
                <p className={cn('font-display text-xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-[var(--text-3)] mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
