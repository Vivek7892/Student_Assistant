import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Badge, Button, Card } from '../../components/ui'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

interface PlannerTask {
  id: string
  title: string
  subject_label: string
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  start_hour: number
  duration: number
  color: string
  done: boolean
  google_calendar_url?: string
}

const days: PlannerTask['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Planner() {
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [form, setForm] = useState({ title: '', subject_label: 'General', day: 'Mon' as PlannerTask['day'], start_hour: 9, duration: 1 })

  async function load() {
    const res = await api.get('/api/courses/planner/')
    setTasks(Array.isArray(res.data) ? res.data : res.data.results ?? [])
  }

  useEffect(() => { load() }, [])

  const sortedTasks = useMemo(() => (
    [...tasks].sort((a, b) => {
      const dayDiff = days.indexOf(a.day) - days.indexOf(b.day)
      return dayDiff || a.start_hour - b.start_hour
    })
  ), [tasks])

  async function create(task = form) {
    await api.post('/api/courses/planner/', { ...task, color: 'primary', done: false })
    setForm({ title: '', subject_label: form.subject_label, day: form.day, start_hour: form.start_hour, duration: form.duration })
    load()
  }

  async function generateWeek() {
    const subject = form.subject_label || 'General'
    for (const [index, day] of days.entries()) {
      await api.post('/api/courses/planner/', {
        title: `${index % 2 === 0 ? 'Study' : 'Practice'} ${subject}`,
        subject_label: subject,
        day,
        start_hour: 9 + (index % 3),
        duration: 1,
        color: 'primary',
        done: false,
      })
    }
    load()
  }

  async function toggle(id: string) {
    const res = await api.patch(`/api/courses/planner/${id}/toggle/`)
    setTasks(current => current.map(task => task.id === id ? res.data : task))
  }

  async function remove(id: string) {
    await api.delete(`/api/courses/planner/${id}/`)
    setTasks(current => current.filter(task => task.id !== id))
  }

  async function sync(id?: string) {
    const url = id ? `/api/courses/planner/${id}/sync-google-calendar/` : '/api/courses/planner/sync-google-calendar/'
    await api.post(url)
    load()
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold">Study Planner</h2>
          <p className="text-sm text-[var(--text-2)]">Weekly tasks saved per user in the database.</p>
        </div>
        <Button variant="secondary" className="sm:ml-auto" onClick={() => sync()}><CalendarDays size={15} /> Sync Week</Button>
        <Button variant="gradient" onClick={generateWeek}><Sparkles size={15} /> Generate Week</Button>
      </div>

      <Card className="grid gap-3 p-4 md:grid-cols-6">
        <input placeholder="Task title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm md:col-span-2" />
        <input placeholder="Subject" value={form.subject_label} onChange={e => setForm(f => ({ ...f, subject_label: e.target.value }))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
        <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value as PlannerTask['day'] }))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">{days.map(day => <option key={day}>{day}</option>)}</select>
        <input type="number" min={0} max={23} value={form.start_hour} onChange={e => setForm(f => ({ ...f, start_hour: Number(e.target.value) }))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
        <Button variant="gradient" disabled={!form.title.trim()} onClick={() => create()}><Plus size={15} /> Add</Button>
      </Card>

      <div className="space-y-2">
        {sortedTasks.map(task => (
          <Card key={task.id} className={cn('p-3 transition-opacity', task.done && 'opacity-70')}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => toggle(task.id)}
                aria-pressed={task.done}
                aria-label={task.done ? 'Mark task active' : 'Mark task done'}
                className={cn(
                  'flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors',
                  task.done ? 'border-emerald-400 bg-emerald-500' : 'border-[var(--border)] bg-[var(--surface-2)]',
                )}
              >
                <span className={cn('h-5 w-5 rounded-full bg-white shadow-sm transition-transform', task.done && 'translate-x-5')} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={task.done ? 'emerald' : 'primary'}>{task.done ? 'Done' : task.day}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--text-3)]">
                    <Clock size={12} /> {task.start_hour}:00 for {task.duration}h
                  </span>
                  {task.google_calendar_url && <Badge color="cyan">Synced</Badge>}
                </div>
                <p className={cn('mt-1 truncate text-sm font-medium', task.done && 'line-through text-[var(--text-3)]')}>{task.title}</p>
                <p className="truncate text-xs text-[var(--text-3)]">{task.subject_label}</p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="sm" onClick={() => sync(task.id)}><CalendarDays size={13} /> Calendar</Button>
                <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => remove(task.id)}><Trash2 size={13} /> Delete</Button>
              </div>
            </div>
          </Card>
        ))}

        {sortedTasks.length === 0 && (
          <Card className="p-6 text-center text-sm text-[var(--text-2)]">
            Add a task or generate a week to build your study list.
          </Card>
        )}
      </div>
    </div>
  )
}
