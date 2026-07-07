import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Check, Trash2, CalendarDays, ExternalLink, RefreshCw } from 'lucide-react'
import { Card, Button, Badge } from '../../components/ui'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)

const COLORS = ['primary', 'emerald', 'cyan', 'amber', 'rose']
const colorClass: Record<string, string> = {
  primary: 'bg-primary-100 dark:bg-primary-900/40 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300',
  emerald: 'bg-emerald-400/15 border-emerald-400/50 text-emerald-700 dark:text-emerald-300',
  cyan:    'bg-cyan-400/15 border-cyan-400/50 text-cyan-700 dark:text-cyan-300',
  amber:   'bg-amber-400/15 border-amber-400/50 text-amber-700 dark:text-amber-300',
  rose:    'bg-rose-400/15 border-rose-400/50 text-rose-700 dark:text-rose-300',
}
const dotClass: Record<string, string> = {
  primary: 'bg-primary-500', emerald: 'bg-emerald-500',
  cyan: 'bg-cyan-500', amber: 'bg-amber-500', rose: 'bg-rose-500',
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
}

interface TaskForm {
  title: string
  day: string
  start_hour: string
  duration: string
  color: string
  subject_label: string
}

const defaultForm: TaskForm = { title: '', day: 'Mon', start_hour: '9', duration: '1', color: 'primary', subject_label: '' }

// Get the Monday of the current week
function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function taskToGoogleCalendarUrl(task: Task, weekStart: Date) {
  const dayIndex = DAYS.indexOf(task.day)
  const date = new Date(weekStart)
  date.setDate(date.getDate() + dayIndex)

  const start = new Date(date)
  start.setHours(task.start_hour, 0, 0, 0)
  const end = new Date(start)
  end.setHours(task.start_hour + (task.duration || 1), 0, 0, 0)

  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text:   task.title + (task.subject_label ? ` — ${task.subject_label}` : ''),
    dates:  `${fmt(start)}/${fmt(end)}`,
    details: `Study session from StudyBuddy${task.subject_label ? `\nSubject: ${task.subject_label}` : ''}`,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export default function Planner() {
  const [tasks,       setTasks]       = useState<Task[]>([])
  const [showModal,   setShowModal]   = useState(false)
  const [form,        setForm]        = useState<TaskForm>(defaultForm)
  const [saving,      setSaving]      = useState(false)
  const [syncing,     setSyncing]     = useState(false)
  const [syncDone,    setSyncDone]    = useState(false)
  const weekStart = getWeekStart()

  useEffect(() => {
    api.get('/api/courses/planner/')
      .then(r => setTasks(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => setTasks([]))
  }, [])

  function openModal(pre: Partial<TaskForm> = {}) {
    setForm({ ...defaultForm, ...pre })
    setShowModal(true)
  }

  async function saveTask() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title:         form.title,
        day:           form.day,
        start_hour:    parseInt(form.start_hour),
        duration:      parseInt(form.duration) || 1,
        color:         form.color,
        subject_label: form.subject_label,
      }
      const r = await api.post('/api/courses/planner/', payload)
      setTasks(t => [...t, r.data])
      setShowModal(false)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  async function toggleTask(id: string) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))
    api.patch(`/api/courses/planner/${id}/toggle/`).catch(() => {
      setTasks(ts => ts.map(t => t.id === id ? { ...t, done: task.done } : t))
    })
  }

  async function deleteTask(id: string) {
    setTasks(ts => ts.filter(t => t.id !== id))
    api.delete(`/api/courses/planner/${id}/`).catch(() => {})
  }

  // Export ALL tasks to Google Calendar (opens each in new tab)
  function exportAllToGoogle() {
    setSyncing(true)
    const pending = tasks.filter(t => !t.done)
    if (pending.length === 0) { setSyncing(false); return }
    // Open first one directly, rest via confirm
    const urls = pending.map(t => taskToGoogleCalendarUrl(t, weekStart))
    urls.forEach((url, i) => setTimeout(() => window.open(url, '_blank'), i * 300))
    setTimeout(() => { setSyncing(false); setSyncDone(true); setTimeout(() => setSyncDone(false), 3000) }, urls.length * 300 + 200)
  }

  const tasksByDayHour = (day: string, hour: number) =>
    tasks.filter(t => t.day === day && t.start_hour === hour)

  const donePct = tasks.length > 0 ? Math.round(tasks.filter(t => t.done).length / tasks.length * 100) : 0

  // Mobile: group tasks by day
  const tasksByDay = DAYS.map(d => ({ day: d, tasks: tasks.filter(t => t.day === d) }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--text-1)]">Weekly Planner</h2>
          <p className="text-xs sm:text-sm text-[var(--text-2)]">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tasks.length > 0 && (
            <Button variant="secondary" size="sm" className={cn('gap-1.5 hidden sm:flex', syncDone && 'text-emerald-500')} onClick={exportAllToGoogle} disabled={syncing}>
              {syncing ? <><RefreshCw size={13} className="animate-spin" /> Syncing…</> : syncDone ? '✓ Synced' : <><ExternalLink size={13} /> Google Cal</>}
            </Button>
          )}
          <Button variant="gradient" size="sm" className="gap-1.5" onClick={() => openModal()}>
            <Plus size={14} /> <span className="hidden xs:inline">Add Task</span><span className="xs:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <motion.div animate={{ width: `${donePct}%` }} className="h-full bg-gradient-primary rounded-full" />
          </div>
          <span className="text-xs text-[var(--text-3)] shrink-0">{donePct}%</span>
          <Badge color={donePct === 100 ? 'emerald' : 'primary'}>{tasks.filter(t => t.done).length}/{tasks.length}</Badge>
        </div>
      )}

      {/* ── Desktop grid ── */}
      <div className="hidden md:block">
        <Card className="overflow-auto">
          <div className="min-w-[700px]">
            <div className="grid border-b border-[var(--border)]" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
              <div className="p-3" />
              {DAYS.map(d => (
                <div key={d} className="p-3 text-center border-l border-[var(--border)]">
                  <p className="text-xs font-semibold text-[var(--text-2)]">{d}</p>
                </div>
              ))}
            </div>
            {HOURS.map(hour => (
              <div key={hour} className="grid border-b border-[var(--border)]" style={{ gridTemplateColumns: '56px repeat(7, 1fr)', minHeight: 64 }}>
                <div className="p-2 text-right pr-3 pt-2">
                  <span className="text-xs text-[var(--text-3)]">{hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}</span>
                </div>
                {DAYS.map(day => {
                  const cellTasks = tasksByDayHour(day, hour)
                  return (
                    <div key={day} className="border-l border-[var(--border)] p-1 hover:bg-[var(--surface-2)] transition-colors cursor-pointer min-h-[64px]"
                      onClick={() => openModal({ day, start_hour: String(hour) })}>
                      {cellTasks.map(task => (
                        <div key={task.id} onClick={e => e.stopPropagation()}
                          className={cn('group relative mb-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all',
                            colorClass[task.color] ?? colorClass.primary, task.done && 'opacity-50 line-through')}>
                          <div className="flex items-center gap-1 pr-14">
                            <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass[task.color] ?? dotClass.primary)} />
                            <span className="truncate">{task.title}</span>
                          </div>
                          {task.subject_label && <p className="text-[10px] opacity-70 truncate mt-0.5 pl-2.5">{task.subject_label}</p>}
                          <div className="absolute right-1 top-1 hidden group-hover:flex gap-0.5">
                            <button onClick={() => toggleTask(task.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"><Check size={10} /></button>
                            <a href={taskToGoogleCalendarUrl(task, weekStart)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                              className="w-5 h-5 rounded flex items-center justify-center hover:bg-blue-500/20 text-blue-500"><ExternalLink size={10} /></a>
                            <button onClick={() => deleteTask(task.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-rose-500/20 text-rose-500"><Trash2 size={10} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-3">
        {tasks.length === 0 ? (
          <Card className="p-8 text-center">
            <CalendarDays size={28} className="mx-auto text-[var(--text-3)] mb-3" />
            <p className="text-sm text-[var(--text-2)]">No tasks yet</p>
            <p className="text-xs text-[var(--text-3)] mt-1">Tap "Add" to schedule a study session</p>
          </Card>
        ) : tasksByDay.filter(g => g.tasks.length > 0).map(group => (
          <div key={group.day}>
            <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider px-1 mb-1.5">{group.day}</p>
            <div className="space-y-2">
              {group.tasks.map(task => (
                <Card key={task.id} className={cn('p-3 border-l-4', {
                  'border-l-primary-400': task.color === 'primary',
                  'border-l-emerald-400': task.color === 'emerald',
                  'border-l-cyan-400':    task.color === 'cyan',
                  'border-l-amber-400':   task.color === 'amber',
                  'border-l-rose-400':    task.color === 'rose',
                })}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium text-[var(--text-1)]', task.done && 'line-through opacity-50')}>{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--text-3)]">
                          {task.start_hour > 12 ? `${task.start_hour - 12}pm` : task.start_hour === 12 ? '12pm' : `${task.start_hour}am`}
                          {' · '}{task.duration}h
                        </span>
                        {task.subject_label && <span className="text-xs text-[var(--text-3)] truncate">{task.subject_label}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleTask(task.id)}
                        className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                          task.done ? 'bg-emerald-400/10 text-emerald-500' : 'hover:bg-[var(--surface-2)] text-[var(--text-3)]')}>
                        <Check size={14} />
                      </button>
                      <a href={taskToGoogleCalendarUrl(task, weekStart)} target="_blank" rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-500/10 text-blue-500">
                        <ExternalLink size={13} />
                      </a>
                      <button onClick={() => deleteTask(task.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/10 text-rose-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {/* Add per-day quick button */}
        <button onClick={() => openModal()}
          className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-sm text-[var(--text-3)] hover:border-primary-400 hover:text-primary-500 transition-colors flex items-center justify-center gap-2">
          <Plus size={14} /> Add task
        </button>
      </div>

      {tasks.length === 0 && (
        <div className="hidden md:block">
          <Card className="p-10 text-center">
            <CalendarDays size={28} className="mx-auto text-[var(--text-3)] mb-3" />
            <p className="text-sm text-[var(--text-2)]">No tasks scheduled yet</p>
            <p className="text-xs text-[var(--text-3)] mt-1">Click any time slot or use "Add Task" to schedule study sessions</p>
          </Card>
        </div>
      )}

      {/* Add Task Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-[var(--text-1)]">Add Task</h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-2)]">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Task title (e.g. Study Chapter 5)"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveTask()}
                />
                <input
                  value={form.subject_label}
                  onChange={e => setForm(f => ({ ...f, subject_label: e.target.value }))}
                  placeholder="Subject label (optional)"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-[var(--text-3)] mb-1 block">Day</label>
                    <select
                      value={form.day}
                      onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                      className="w-full px-2 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    >
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-3)] mb-1 block">Start</label>
                    <select
                      value={form.start_hour}
                      onChange={e => setForm(f => ({ ...f, start_hour: e.target.value }))}
                      className="w-full px-2 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    >
                      {HOURS.map(h => (
                        <option key={h} value={h}>
                          {h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-3)] mb-1 block">Hours</label>
                    <select
                      value={form.duration}
                      onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                      className="w-full px-2 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    >
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}h</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-3)] mb-1.5 block">Color</label>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={cn(
                          'w-7 h-7 rounded-full transition-all',
                          dotClass[c],
                          form.color === c ? 'ring-2 ring-offset-2 ring-[var(--primary)] scale-110' : 'opacity-60 hover:opacity-100'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="gradient" size="sm" onClick={saveTask} disabled={saving || !form.title.trim()}>
                  {saving ? 'Saving…' : 'Add Task'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
