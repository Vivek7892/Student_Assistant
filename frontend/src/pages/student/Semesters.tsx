import { useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, BookOpen, ArrowRight, GraduationCap, ChevronRight, Plus, X, Calendar, Hash, Users, CheckCircle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Button, Badge } from '@/components/ui'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useSemesters, useSemester, useSemesterSubjects, useEnrollSemester, useCreateSemester } from '@/api/courses'
import { useAuthStore } from '@/store/authStore'

const semesterGradients = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-purple-500 to-violet-600',
  'from-cyan-500 to-blue-600',
  'from-green-500 to-emerald-600',
]

function SemesterDetail({ id, basePath }: { id: string; basePath: string }) {
  const { data: semester, isLoading } = useSemester(id)
  const { data: subjects, isLoading: subjectsLoading } = useSemesterSubjects(id)

  if (isLoading) return (
    <div className="space-y-6">
      <div className="h-32 rounded-2xl bg-muted animate-pulse" />
      <div className="grid md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={`${basePath}/semesters`} className="hover:text-foreground transition-colors">Semesters</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Semester {semester?.number}</span>
      </div>

      <div className={`bg-gradient-to-br ${semesterGradients[(semester?.number || 1) % semesterGradients.length]} rounded-2xl p-6 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Semester</p>
            <h2 className="text-5xl font-black mt-1">{semester?.number}</h2>
            <div className="flex items-center gap-4 mt-3 text-sm text-white/80">
              <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{subjects?.length || 0} subjects</span>
              {semester?.academic_year && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{semester.academic_year}</span>}
              {semester?.department && <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />{semester.department}</span>}
            </div>
          </div>
          <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Layers className="h-10 w-10 text-white/60" />
          </div>
        </div>
        {semester?.description && <p className="text-white/70 text-sm mt-3 max-w-lg">{semester.description}</p>}
      </div>

      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" /> Subjects in this semester
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectsLoading
            ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            : subjects?.map((subject, i) => (
                <motion.div key={subject.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`${basePath}/subjects?id=${subject.id}`}>
                    <Card hover className="space-y-3 p-5">
                      <div className="flex items-start justify-between">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant="secondary" className="text-xs">{subject.credits} cr</Badge>
                      </div>
                      <div>
                        <h3 className="font-semibold">{subject.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{subject.code}</p>
                        {subject.teacher_name && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Users className="h-3 w-3" />{subject.teacher_name}</p>}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border">
                        <span className="text-xs text-muted-foreground">{subject.materials_count || 0} materials</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
          {!subjectsLoading && !subjects?.length && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No subjects in this semester yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SemestersPage() {
  const { id } = useParams()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const isTeacher = user?.role === 'teacher'
  const basePath = isTeacher ? '/teacher' : '/student'

  const { data: semesters, isLoading } = useSemesters()
  const { mutate: enroll, isPending: enrolling } = useEnrollSemester()
  const { mutate: createSemester, isPending: creating } = useCreateSemester()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ number: '', department: '', academic_year: '', description: '' })

  const handleCreate = () => {
    if (!form.number || !form.department) return
    createSemester(
      { number: Number(form.number), department: form.department, academic_year: form.academic_year, description: form.description },
      { onSuccess: () => { setShowCreate(false); setForm({ number: '', department: '', academic_year: '', description: '' }) } }
    )
  }

  if (id) {
    return (
      <DashboardLayout title="Semester Detail">
        <SemesterDetail id={id} basePath={basePath} />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Semesters">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">{semesters?.count || 0} semesters available</p>
          {isTeacher && (
            <Button onClick={() => setShowCreate(!showCreate)} size="sm">
              <Plus className="h-4 w-4" /> New Semester
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Create Semester</h3>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Semester Number <span className="text-destructive">*</span></label>
                    <input type="number" min={1} max={8}
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g. 3" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Department <span className="text-destructive">*</span></label>
                    <input className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g. Computer Science" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Academic Year</label>
                    <input className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g. 2024-25" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Description</label>
                    <input className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button loading={creating} disabled={!form.number || !form.department} onClick={handleCreate}>
                    <Plus className="h-4 w-4" /> Create Semester
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : semesters?.results?.map((sem, i) => {
                const gradient = semesterGradients[i % semesterGradients.length]
                return (
                  <motion.div key={sem.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card hover className="space-y-4 p-0 overflow-hidden">
                      <div className={`bg-gradient-to-br ${gradient} p-5`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-white/70 text-xs uppercase tracking-wide font-medium">Semester</p>
                            <p className="text-5xl font-black text-white">{sem.number}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className="bg-white/20 text-white border-0 text-xs">{sem.subjects_count || 0} subjects</Badge>
                            {sem.is_active && <Badge className="bg-white/20 text-white border-0 text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="px-5 pb-5 space-y-3">
                        <div>
                          {sem.department && <p className="text-xs text-muted-foreground">{sem.department}{sem.academic_year ? ` · ${sem.academic_year}` : ''}</p>}
                          {sem.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sem.description}</p>}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Link to={`${basePath}/semesters/${sem.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              <BookOpen className="h-3.5 w-3.5" /> View Subjects
                            </Button>
                          </Link>
                          {!isTeacher && (
                            <Button size="sm" loading={enrolling} onClick={() => enroll(sem.id)}>
                              <GraduationCap className="h-3.5 w-3.5" /> Enroll
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
          {!isLoading && !semesters?.results?.length && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No semesters available yet.</p>
              {isTeacher && <p className="text-sm mt-1">Create the first semester to get started.</p>}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
