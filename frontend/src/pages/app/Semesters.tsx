import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, BookOpen, User, Calendar, Plus, GraduationCap, X } from 'lucide-react'
import { Card, Badge, Button, ProgressRing, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { cn, colorMap } from '../../lib/utils'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const ringColors: Record<number, string> = {
  0: 'oklch(55% 0.26 290)',
  1: 'oklch(70% 0.20 162)',
  2: 'oklch(72% 0.18 210)',
  3: 'oklch(75% 0.20 80)',
  4: 'oklch(64% 0.22 15)',
}
const badgeColors = ['primary', 'emerald', 'cyan', 'amber', 'rose']

export default function Semesters() {
  const [semesters, setSemesters] = useState<any[]>([])
  const [active,    setActive]    = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ name: '', number: '', department: '', academic_year: '' })
  const [saving,    setSaving]    = useState(false)
  const [formErr,   setFormErr]   = useState('')

  useEffect(() => {
    api.get('/api/courses/semesters/')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data?.results ?? []
        setSemesters(data)
        if (data.length > 0) setActive(data[0].id)
      })
      .catch(() => setSemesters([]))
      .finally(() => setLoading(false))
  }, [])

  async function createSemester() {
    if (!form.name.trim() || !form.number || !form.department.trim() || !form.academic_year.trim()) {
      setFormErr('All fields are required'); return
    }
    setSaving(true); setFormErr('')
    try {
      const r = await api.post('/api/courses/semesters/', {
        name:          form.name,
        number:        parseInt(form.number),
        department:    form.department,
        academic_year: form.academic_year,
      })
      setSemesters(s => [...s, r.data])
      setActive(r.data.id)
      setShowModal(false)
      setForm({ name: '', number: '', department: '', academic_year: '' })
    } catch (e: any) {
      const d = e?.response?.data
      setFormErr(d ? Object.values(d).flat().join(' ') : 'Failed to create semester')
    } finally {
      setSaving(false)
    }
  }

  const semesterModal = (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-[var(--text-1)]">Create Semester</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-2)]"><X size={16} /></button>
            </div>
            {formErr && <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{formErr}</p>}
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Semester name (e.g. Fall 2025)"
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  placeholder="Semester number" type="number" min="1"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
                <input value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                  placeholder="Year (e.g. 2024-25)"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
              </div>
              <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                placeholder="Department (e.g. Computer Science)"
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="gradient" size="sm" onClick={createSemester} disabled={saving}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  const semester = semesters.find(s => s.id === active)

  if (loading) {
    return (
      <div className="space-y-4 max-w-6xl">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (semesters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lift">
          <GraduationCap size={28} className="text-white" />
        </div>
        <h3 className="font-display text-xl font-bold text-[var(--text-1)]">No semesters yet</h3>
        <p className="text-sm text-[var(--text-2)]">Create your first semester to start organizing your courses and study materials.</p>
        <Button variant="gradient" className="gap-2" onClick={() => { setShowModal(true); setFormErr('') }}>
          <Plus size={15} /> Create Semester
        </Button>
        {showModal && semesterModal}
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        {semesters.map(s => (
          <button key={s.id} onClick={() => setActive(s.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              active === s.id
                ? 'bg-gradient-primary text-white shadow-glass'
                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)]'
            )}
          >
            {s.status === 'completed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
            {s.name}
          </button>
        ))}
        <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => { setShowModal(true); setFormErr('') }}>
          <Plus size={14} /> New
        </Button>
      </motion.div>

      {semester && (
        <>
          {/* Overview */}
          <motion.div variants={fadeUp}>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold text-[var(--text-1)]">{semester.name}</h2>
                  <p className="text-sm text-[var(--text-2)] mt-0.5 flex items-center gap-1.5">
                    <Calendar size={13} />
                    {semester.start_date} → {semester.end_date}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <ProgressRing value={semester.progress ?? 0} size={64} stroke={6} color="oklch(55% 0.26 290)">
                    <span className="text-xs font-bold text-[var(--text-1)]">{semester.progress ?? 0}%</span>
                  </ProgressRing>
                  <Badge color={semester.status === 'active' ? 'emerald' : 'primary'}>
                    {semester.status === 'active' ? 'In Progress' : 'Completed'}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${semester.progress ?? 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-primary rounded-full"
                />
              </div>
            </Card>
          </motion.div>

          {/* Subjects */}
          {(semester.subjects ?? []).length === 0 ? (
            <motion.div variants={fadeUp}>
              <Card className="p-10 text-center">
                <BookOpen size={28} className="mx-auto text-[var(--text-3)] mb-3" />
                <p className="text-sm text-[var(--text-2)]">No subjects in this semester yet.</p>
                <Button variant="gradient" size="sm" className="mt-3 gap-1.5"><Plus size={13} /> Add Subject</Button>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(semester.subjects ?? []).map((s: any, idx: number) => {
                const color = badgeColors[idx % badgeColors.length]
                const ringColor = ringColors[idx % Object.keys(ringColors).length]
                return (
                  <Card key={s.id} hover className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge color={color}>{s.code}</Badge>
                        <h3 className="font-display font-semibold text-[var(--text-1)] mt-2 text-sm leading-snug">{s.name}</h3>
                      </div>
                      <ProgressRing value={s.progress ?? 0} size={48} stroke={4} color={ringColor}>
                        <span className="text-[9px] font-bold text-[var(--text-1)]">{s.progress ?? 0}%</span>
                      </ProgressRing>
                    </div>
                    <div className="space-y-1.5 text-xs text-[var(--text-2)]">
                      {s.instructor && <div className="flex items-center gap-1.5"><User size={12} /> {s.instructor}</div>}
                      <div className="flex items-center gap-1.5"><BookOpen size={12} /> {s.credits ?? 0} credits</div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                      <div className="h-1.5 flex-1 bg-[var(--surface-2)] rounded-full overflow-hidden mr-3">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${s.progress ?? 0}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={cn('h-full rounded-full', colorMap[color]?.bg ?? 'bg-primary-500')}
                        />
                      </div>
                      {s.grade && <span className="text-xs font-bold text-[var(--text-1)]">{s.grade}</span>}
                    </div>
                  </Card>
                )
              })}
            </motion.div>
          )}
        </>
      )}
      {semesterModal}
    </motion.div>
  )
}
