import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { Badge, Button, Card, Skeleton } from '../../components/ui'
import { cn } from '../../lib/utils'
import { api } from '../../lib/api'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TASK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const colorClass: Record<string, string> = {
  primary: 'bg-primary-500/12 text-primary-600 dark:text-primary-300',
  emerald: 'bg-emerald-400/15 text-emerald-700 dark:text-emerald-300',
  cyan: 'bg-cyan-400/15 text-cyan-700 dark:text-cyan-300',
  amber: 'bg-amber-400/15 text-amber-700 dark:text-amber-300',
  rose: 'bg-rose-400/15 text-rose-700 dark:text-rose-300',
}

interface Task {
  id: string
  title: string
  day: string
  start_hour: number
  duration: number
  color: string
  done: boolean
  subject_label?: string
  google_calendar_url?: string
  google_synced_at?: string | null
}

function getMonday(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function taskDate(task: Task, weekStart: Date) {
  const index = Math.max(0, TASK_DAYS.indexOf(task.day))
  const date = new Date(weekStart)
  date.setDate(weekStart.getDate() + index)
  date.setHours(task.start_hour, 0, 0, 0)
  return date
}

function hourLabel(hour: number) {
  if (hour === 12) return '12pm'
  return hour > 12 ? `${hour - 12}pm` : `${hour}am`
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default function Calendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')

  const weekStart = useMemo(() => getMonday(today), [])
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1)

  useEffect(() => {
    api.get('/api/courses/planner/')
      .then(res => setTasks(Array.isArray(res.data) ? res.data : res.data?.results ?? []))
      .catch(() => setError('Could not load calendar items.'))
      .finally(() => setLoading(false))
  }, [])

  const events = useMemo(() => tasks.map(task => ({
    task,
    date: taskDate(task, weekStart),
  })), [tasks, weekStart])

  const upcoming = useMemo(
    () => [...events].filter(item => !item.task.done).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 8),
    [events]
  )

  function eventsForDay(day: number) {
    return events.filter(item =>
      item.date.getFullYear() === year &&
      item.date.getMonth() === month &&
      item.date.getDate() === day
    )
  }

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1)
  }

  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  async function syncAll() {
    setSyncing(true)
    setError('')
    try {
      const res = await api.post('/api/courses/planner/sync-google-calendar/', { week_start: isoDate(weekStart) })
      const synced: Task[] = res.data?.items ?? []
      setTasks(prev => prev.map(task => synced.find(item => item.id === task.id) ?? task))
      synced.forEach((task, index) => {
        if (task.google_calendar_url) {
          window.setTimeout(() => window.open(task.google_calendar_url, '_blank'), index * 250)
        }
      })
    } catch {
      setError('Google Calendar sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  async function syncOne(task: Task) {
    setError('')
    try {
      const res = await api.post(`/api/courses/planner/${task.id}/sync-google-calendar/`, { week_start: isoDate(weekStart) })
      const updated = res.data
      setTasks(prev => prev.map(item => item.id === task.id ? updated : item))
      if (updated.google_calendar_url) window.open(updated.google_calendar_url, '_blank')
    } catch {
      setError('Could not sync this item.')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--text-1)]">Calendar</h2>
          <p className="text-sm text-[var(--text-2)]">Planner sessions, deadlines, and Google Calendar sync</p>
        </div>
        <Button variant="gradient" size="sm" className="w-full gap-2 sm:w-auto" onClick={syncAll} disabled={syncing || tasks.length === 0}>
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sync Google Calendar
        </Button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold text-[var(--text-1)]">{MONTHS[month]} {year}</h3>
            <div className="flex gap-2">
              <button onClick={prev} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)]" aria-label="Previous month">
                <ChevronLeft size={16} className="text-[var(--text-2)]" />
              </button>
              <button onClick={next} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)]" aria-label="Next month">
                <ChevronRight size={16} className="text-[var(--text-2)]" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="py-2 text-center text-[10px] font-semibold text-[var(--text-3)] sm:text-xs">{day}</div>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="min-h-16 sm:min-h-24" />
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                const dayEvents = eventsForDay(day)
                return (
                  <div
                    key={i}
                    className={cn(
                      'min-h-16 rounded-xl border border-[var(--border)] p-1.5 transition-colors sm:min-h-28 sm:p-2',
                      isToday ? 'bg-primary-500/10 ring-1 ring-primary-500/30' : 'bg-[var(--surface)] hover:bg-[var(--surface-2)]'
                    )}
                  >
                    <div className={cn('mb-1 flex h-6 w-6 items-center justify-center rounded-lg text-xs font-semibold', isToday ? 'bg-primary-500 text-white' : 'text-[var(--text-2)]')}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map(({ task }) => (
                        <button key={task.id} onClick={() => syncOne(task)}
                          className={cn('block w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-medium sm:text-xs', colorClass[task.color] ?? colorClass.primary, task.done && 'opacity-50 line-through')}>
                          {task.title}
                        </button>
                      ))}
                      {dayEvents.length > 2 && <p className="text-[10px] text-[var(--text-3)]">+{dayEvents.length - 2} more</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-semibold text-[var(--text-1)]">Upcoming</h3>
              <Badge color="primary">{tasks.filter(task => !task.done).length} active</Badge>
            </div>
            {loading ? (
              <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : upcoming.length === 0 ? (
              <div className="py-8 text-center">
                <CalendarDays size={28} className="mx-auto mb-2 text-[var(--text-3)]" />
                <p className="text-sm text-[var(--text-2)]">No scheduled study sessions.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map(({ task, date }) => (
                  <div key={task.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-1)]">{task.title}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-3)]">
                          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {hourLabel(task.start_hour)} · {task.duration}h
                        </p>
                        {task.subject_label && <p className="mt-0.5 truncate text-xs text-[var(--text-3)]">{task.subject_label}</p>}
                      </div>
                      <button onClick={() => syncOne(task)} className="shrink-0 rounded-lg p-2 text-blue-500 hover:bg-blue-500/10" aria-label="Sync item to Google Calendar">
                        <ExternalLink size={15} />
                      </button>
                    </div>
                    {task.google_synced_at && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-emerald-500">
                        <CalendarCheck size={12} /> Synced
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
