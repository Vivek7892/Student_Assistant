import { useEffect, useState } from 'react'
import { Plus, Target, Trash2, X } from 'lucide-react'
import { Badge, Button, Card } from '../../components/ui'
import { api } from '../../lib/api'
import { daysUntil } from '../../lib/utils'

interface Goal {
  id: string
  title: string
  target: number
  current: number
  unit: string
  deadline: string
  linked_activity: '' | 'focus' | 'quiz' | 'flashcards' | 'documents'
  token: string
}

const today = () => new Date().toISOString().slice(0, 10)

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', target: '10', unit: 'hours', deadline: today(), linked_activity: '' })

  async function load() {
    const res = await api.get('/api/ai/goals/')
    setGoals(Array.isArray(res.data) ? res.data : res.data.results ?? [])
  }

  useEffect(() => { load() }, [])

  async function create() {
    await api.post('/api/ai/goals/', {
      title: form.title,
      target: Number(form.target) || 1,
      current: 0,
      unit: form.unit || 'items',
      deadline: form.deadline,
      linked_activity: form.linked_activity,
    })
    setOpen(false)
    setForm({ title: '', target: '10', unit: 'hours', deadline: today(), linked_activity: '' })
    load()
  }

  async function progress(goal: Goal, delta: number) {
    const res = await api.patch(`/api/ai/goals/${goal.id}/progress/`, { delta })
    setGoals(current => current.map(item => item.id === goal.id ? res.data : item))
  }

  async function remove(id: string) {
    await api.delete(`/api/ai/goals/${id}/`)
    setGoals(current => current.filter(goal => goal.id !== id))
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex items-center">
        <div>
          <h2 className="font-display text-xl font-bold">Goals</h2>
          <p className="text-sm text-[var(--text-2)]">Targets saved privately to your account.</p>
        </div>
        <Button className="ml-auto" variant="gradient" onClick={() => setOpen(true)}><Plus size={15} /> Add Goal</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {goals.map(goal => {
          const pct = goal.target ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0
          return (
            <Card key={goal.id} className="p-4">
              <div className="flex items-start gap-2">
                <Target size={18} className="text-primary-500" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display font-semibold">{goal.title}</h3>
                  <p className="text-xs text-[var(--text-3)]">Token {goal.token.slice(0, 8)}</p>
                </div>
                <button onClick={() => remove(goal.id)} className="text-[var(--text-3)] hover:text-rose-500"><Trash2 size={15} /></button>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"><div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} /></div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>{goal.current.toFixed(goal.unit === 'hours' ? 1 : 0)} / {goal.target} {goal.unit}</span>
                <Badge color={daysUntil(goal.deadline) <= 3 ? 'rose' : 'emerald'}>{daysUntil(goal.deadline)}d left</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => progress(goal, -1)}>-</Button>
                <Button variant="secondary" size="sm" onClick={() => progress(goal, 1)}>+</Button>
              </div>
            </Card>
          )
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-5">
            <div className="flex items-center justify-between"><h3 className="font-display font-semibold">Add Goal</h3><button onClick={() => setOpen(false)}><X size={16} /></button></div>
            <div className="mt-4 space-y-3">
              <input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
              <input type="number" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
              <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
              <select value={form.linked_activity} onChange={e => setForm(f => ({ ...f, linked_activity: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                <option value="">Manual progress</option>
                <option value="focus">Focus sessions</option>
                <option value="quiz">Quizzes</option>
                <option value="flashcards">Flashcards</option>
                <option value="documents">Documents</option>
              </select>
            </div>
            <Button className="mt-4 w-full" variant="gradient" disabled={!form.title.trim()} onClick={create}>Create Goal</Button>
          </Card>
        </div>
      )}
    </div>
  )
}
