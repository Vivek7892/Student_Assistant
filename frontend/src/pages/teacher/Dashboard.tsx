import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BookOpen, Users, ClipboardList, Clock, CheckCircle2, AlertCircle, ChevronRight, GraduationCap } from 'lucide-react'
import { Card, Badge, Button, ProgressRing } from '../../components/ui'
import { cn, colorMap } from '../../lib/utils'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const ringColors: Record<string, string> = {
  primary: 'oklch(55% 0.26 290)',
  emerald: 'oklch(70% 0.20 162)',
  cyan:    'oklch(72% 0.18 210)',
  amber:   'oklch(75% 0.20 80)',
  rose:    'oklch(64% 0.22 15)',
}

const subjects = [
  { id: 's1', code: 'CS301', name: 'Algorithms & Data Structures', color: 'primary', students: 62, materials: 12, avgScore: 78, nextClass: 'Tomorrow 10:00 AM' },
  { id: 's2', code: 'CS445', name: 'Machine Learning',             color: 'emerald', students: 48, materials: 8,  avgScore: 72, nextClass: 'Wed 2:00 PM'      },
  { id: 's3', code: 'CS480', name: 'Distributed Systems',          color: 'cyan',    students: 55, materials: 10, avgScore: 65, nextClass: 'Thu 11:00 AM'     },
]

const pendingSubmissions = [
  { id: 'p1', title: 'CS301 Assignment 4 — Red-Black Trees',  subject: 'CS301', color: 'primary', count: 18, due: '2025-02-15' },
  { id: 'p2', title: 'ML Project Proposal',                   subject: 'CS445', color: 'emerald', count: 12, due: '2025-02-18' },
  { id: 'p3', title: 'Distributed Systems Lab Report',        subject: 'CS480', color: 'cyan',    count: 9,  due: '2025-02-20' },
]

const quizPerformance = [
  { subject: 'CS301', avg: 78, high: 95, low: 52 },
  { subject: 'CS445', avg: 72, high: 91, low: 48 },
  { subject: 'CS480', avg: 65, high: 88, low: 40 },
]

const recentActivity = [
  { text: '18 new submissions for CS301 Assignment 4', time: '2h ago',  type: 'submission' },
  { text: 'Quiz "Algorithms Mid-Term Prep" completed by 42 students', time: '5h ago',  type: 'quiz'       },
  { text: 'New material uploaded: CS445 Lecture 12 Notes', time: '1d ago',  type: 'material'   },
  { text: '12 students enrolled in CS480 this week', time: '2d ago',  type: 'enrollment' },
]

const activityColor: Record<string, string> = {
  submission: 'text-primary-500', quiz: 'text-emerald-500',
  material: 'text-cyan-500', enrollment: 'text-amber-500',
}

export default function TeacherDashboard() {
  const [activeSubject, setActiveSubject] = useState(subjects[0].id)
  const subject = subjects.find(s => s.id === activeSubject)!

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-7xl">
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
          <GraduationCap size={18} className="text-white" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--text-1)]">Teacher Dashboard</h2>
          <p className="text-sm text-[var(--text-2)]">Spring 2025 · 3 subjects · 165 students</p>
        </div>
      </motion.div>

      {/* KPI row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students',    value: '165',  icon: Users,         color: 'text-primary-500', bg: 'bg-primary-100 dark:bg-primary-900/30' },
          { label: 'Subjects',          value: '3',    icon: BookOpen,      color: 'text-emerald-500', bg: 'bg-emerald-400/10' },
          { label: 'Pending Grading',   value: '39',   icon: ClipboardList, color: 'text-amber-500',   bg: 'bg-amber-400/10'   },
          { label: 'Avg Quiz Score',    value: '72%',  icon: CheckCircle2,  color: 'text-cyan-500',    bg: 'bg-cyan-400/10'    },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--text-3)] font-medium">{s.label}</p>
                <p className="font-display text-2xl font-bold text-[var(--text-1)] mt-1">{s.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon size={18} className={s.color} />
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Subject tabs + detail */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Subject list */}
        <Card className="p-5 space-y-3">
          <h3 className="font-display font-semibold text-[var(--text-1)]">My Subjects</h3>
          {subjects.map(s => (
            <button key={s.id} onClick={() => setActiveSubject(s.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
                activeSubject === s.id ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800' : 'hover:bg-[var(--surface-2)]'
              )}
            >
              <ProgressRing value={s.avgScore} size={40} stroke={4} color={ringColors[s.color]}>
                <span className="text-[8px] font-bold text-[var(--text-1)]">{s.avgScore}</span>
              </ProgressRing>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-1)] truncate">{s.code}</p>
                <p className="text-xs text-[var(--text-3)] truncate">{s.name}</p>
              </div>
              <ChevronRight size={14} className="text-[var(--text-3)] shrink-0" />
            </button>
          ))}
        </Card>

        {/* Subject detail */}
        <Card className="lg:col-span-2 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <Badge color={subject.color}>{subject.code}</Badge>
              <h3 className="font-display font-semibold text-[var(--text-1)] mt-2">{subject.name}</h3>
            </div>
            <Button variant="gradient" size="sm">Upload Material</Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Students',  value: subject.students, icon: Users     },
              { label: 'Materials', value: subject.materials, icon: BookOpen  },
              { label: 'Avg Score', value: `${subject.avgScore}%`, icon: CheckCircle2 },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-xl bg-[var(--surface-2)] text-center">
                <m.icon size={16} className="mx-auto text-[var(--text-3)] mb-1" />
                <p className="font-display text-lg font-bold text-[var(--text-1)]">{m.value}</p>
                <p className="text-xs text-[var(--text-3)]">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--surface-2)]">
            <Clock size={14} className="text-[var(--text-3)]" />
            <span className="text-sm text-[var(--text-2)]">Next class: <span className="font-medium text-[var(--text-1)]">{subject.nextClass}</span></span>
          </div>

          {/* Quiz performance chart */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3">Quiz Performance</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={quizPerformance} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="subject" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="avg"  fill="oklch(55% 0.26 290)" radius={[4, 4, 0, 0]} name="Avg Score" />
                <Bar dataKey="high" fill="oklch(70% 0.20 162)" radius={[4, 4, 0, 0]} name="Highest"   />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Pending submissions + activity */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending grading */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-[var(--text-1)]">Pending Grading</h3>
            <Badge color="amber">39 total</Badge>
          </div>
          <div className="space-y-2.5">
            {pendingSubmissions.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
                <div className={cn('w-1.5 h-10 rounded-full', colorMap[p.color]?.bg)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-1)] truncate">{p.title}</p>
                  <p className="text-xs text-[var(--text-3)]">Due {p.due}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-500">{p.count}</span>
                  <Button variant="secondary" size="sm">Grade</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-[var(--text-1)] mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', activityColor[a.type].replace('text-', 'bg-'))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-1)] leading-snug">{a.text}</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
