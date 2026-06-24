import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, X, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Button, Badge } from '@/components/ui'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { useSubjects } from '@/api/courses'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function useAssignments() {
  return useQuery({
    queryKey: ['assignments'],
    queryFn: () => api.get('/assignments/assignments/').then((r) => r.data),
  })
}

function useSubmissions(assignmentId: string) {
  return useQuery({
    queryKey: ['submissions', assignmentId],
    queryFn: () => api.get(`/assignments/assignments/${assignmentId}/submissions/`).then((r) => r.data),
    enabled: !!assignmentId,
  })
}

function GradeModal({ submission, maxMarks, onClose }: { submission: any; maxMarks: number; onClose: () => void }) {
  const [marks, setMarks] = useState(submission.marks_obtained || '')
  const [feedback, setFeedback] = useState(submission.feedback || '')
  const qc = useQueryClient()

  const { mutate: grade, isPending } = useMutation({
    mutationFn: () => api.post(`/assignments/submissions/${submission.id}/grade/`, { marks_obtained: +marks, feedback }),
    onSuccess: () => {
      toast.success('Graded successfully')
      qc.invalidateQueries({ queryKey: ['submissions', submission.assignment] })
      onClose()
    },
    onError: () => toast.error('Grading failed'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Grade Submission</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Student</p>
            <p className="font-medium">{submission.student_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Marks <span className="text-muted-foreground">/ {maxMarks}</span></label>
            <input
              type="number"
              min={0}
              max={maxMarks}
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Feedback</label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write feedback for the student..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" loading={isPending} disabled={!marks} onClick={() => grade()}>
              <Star className="h-4 w-4" /> Submit Grade
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

function AssignmentRow({ assignment }: { assignment: any }) {
  const [expanded, setExpanded] = useState(false)
  const [grading, setGrading] = useState<any>(null)
  const { data: submissions, isLoading } = useSubmissions(expanded ? assignment.id : '')

  const statusColor: Record<string, string> = {
    published: 'success', draft: 'secondary', closed: 'destructive',
  }

  return (
    <Card className="space-y-0 p-0 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold">{assignment.title}</h3>
            <p className="text-xs text-muted-foreground">{assignment.subject_name} · Due {formatDate(assignment.due_date)} · {assignment.max_marks} marks</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusColor[assignment.status] as any}>{assignment.status}</Badge>
          <span className="text-xs text-muted-foreground">{assignment.submissions_count} submissions</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Submissions</p>
              {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
              {submissions?.map((sub: any) => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                  <div>
                    <p className="text-sm font-medium">{sub.student_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {sub.status === 'graded'
                        ? <><CheckCircle className="h-3 w-3 text-green-500" /> Graded: {sub.marks_obtained}/{assignment.max_marks}</>
                        : sub.status === 'late'
                        ? <><AlertCircle className="h-3 w-3 text-orange-500" /> Late submission</>
                        : <><Clock className="h-3 w-3" /> Submitted</>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {sub.file_url && (
                      <a href={sub.file_url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">View</Button>
                      </a>
                    )}
                    <Button size="sm" onClick={() => setGrading(sub)} disabled={sub.status === 'graded'}>
                      {sub.status === 'graded' ? 'Graded' : 'Grade'}
                    </Button>
                  </div>
                </div>
              ))}
              {!isLoading && !submissions?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">No submissions yet</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {grading && (
        <GradeModal
          submission={grading}
          maxMarks={assignment.max_marks}
          onClose={() => setGrading(null)}
        />
      )}
    </Card>
  )
}

export default function TeacherAssignments() {
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', subject: '', description: '', due_date: '', max_marks: 100, status: 'published' })
  const { data: assignments, isLoading } = useAssignments()
  const { data: subjects } = useSubjects()
  const qc = useQueryClient()

  const handleCreate = async () => {
    if (!form.title || !form.subject || !form.due_date) {
      toast.error('Fill all required fields')
      return
    }
    setCreating(true)
    try {
      await api.post('/assignments/assignments/', form)
      toast.success('Assignment created')
      qc.invalidateQueries({ queryKey: ['assignments'] })
      setShowCreate(false)
      setForm({ title: '', subject: '', description: '', due_date: '', max_marks: 100, status: 'published' })
    } catch {
      toast.error('Failed to create assignment')
    } finally {
      setCreating(false)
    }
  }

  return (
    <DashboardLayout title="Assignments">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">{assignments?.count || assignments?.length || 0} assignments</p>
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" /> New Assignment
          </Button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Create Assignment</h3>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Title <span className="text-destructive">*</span></label>
                    <input className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Assignment title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Subject <span className="text-destructive">*</span></label>
                    <select className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                      <option value="">Select subject...</option>
                      {subjects?.results?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Due Date <span className="text-destructive">*</span></label>
                    <input type="datetime-local" className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Max Marks</label>
                    <input type="number" className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: +e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <textarea rows={3} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Assignment instructions..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setForm({ ...form, status: 'draft' })} className={form.status === 'draft' ? 'border-primary' : ''}>
                    Save as Draft
                  </Button>
                  <Button loading={creating} onClick={handleCreate}>
                    <Plus className="h-4 w-4" /> Publish Assignment
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            : assignments?.results?.map((a: any, i: number) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <AssignmentRow assignment={a} />
                </motion.div>
              ))}
          {!isLoading && !assignments?.results?.length && (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No assignments yet. Create your first one!</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
