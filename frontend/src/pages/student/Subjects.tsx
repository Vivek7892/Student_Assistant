import { useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, FileText, MessageSquare, Search, Plus, X, Users, Hash, ChevronRight, Layers, Award, Brain } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Button, Badge } from '@/components/ui'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useSubjects, useSubjectMaterials, useCreateSubject, useSemesters } from '@/api/courses'
import { useAuthStore } from '@/store/authStore'
import { getMaterialTypeColor } from '@/lib/utils'

function SubjectDetailPanel({ subjectId, basePath, onClose }: { subjectId: string; basePath: string; onClose: () => void }) {
  const { data: subjects } = useSubjects()
  const subject = subjects?.results?.find((s) => s.id === subjectId)
  const { data: materials, isLoading } = useSubjectMaterials(subjectId)

  if (!subject) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="w-80 shrink-0 flex flex-col gap-4"
    >
      <Card className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div>
          <h3 className="font-bold text-lg">{subject.name}</h3>
          <p className="text-sm text-muted-foreground">{subject.code}</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground flex items-center gap-1.5"><Award className="h-3.5 w-3.5" />Credits</span>
            <span className="font-medium">{subject.credits}</span>
          </div>
          {subject.teacher_name && (
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Teacher</span>
              <span className="font-medium truncate max-w-[140px]">{subject.teacher_name}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Materials</span>
            <span className="font-medium">{subject.materials_count || 0}</span>
          </div>
        </div>
        {subject.description && <p className="text-sm text-muted-foreground">{subject.description}</p>}
        <div className="flex flex-col gap-2 pt-1">
          <Link to={`${basePath}/materials?subject=${subject.id}`}>
            <Button variant="outline" size="sm" className="w-full">
              <FileText className="h-3.5 w-3.5" /> View Materials
            </Button>
          </Link>
          <Link to={`${basePath}/chat?subject=${subject.id}`}>
            <Button size="sm" className="w-full">
              <MessageSquare className="h-3.5 w-3.5" /> Ask AI About This
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Recent Materials</h4>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : materials?.length ? (
          <div className="space-y-2">
            {materials.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-all">
                <span className="text-lg">{m.file_type === 'PDF' ? '📄' : m.file_type === 'DOCX' ? '📝' : '📁'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{m.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${getMaterialTypeColor(m.material_type)}`}>{m.material_type}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">No materials yet</p>
        )}
      </Card>
    </motion.div>
  )
}

export default function SubjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'))

  const user = useAuthStore((s) => s.user)
  const isTeacher = user?.role === 'teacher'
  const basePath = isTeacher ? '/teacher' : '/student'

  const { data: subjects, isLoading } = useSubjects()
  const { data: semesters } = useSemesters()
  const { mutate: createSubject, isPending: creating } = useCreateSubject()
  const [form, setForm] = useState({ name: '', code: '', semester: '', credits: '3', description: '' })

  const filtered = subjects?.results?.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = () => {
    if (!form.name || !form.code || !form.semester) return
    createSubject(
      { name: form.name, code: form.code, semester: form.semester, credits: Number(form.credits), description: form.description },
      { onSuccess: () => { setShowCreate(false); setForm({ name: '', code: '', semester: '', credits: '3', description: '' }) } }
    )
  }

  const handleSelectSubject = (id: string) => {
    const newId = selectedId === id ? null : id
    setSelectedId(newId)
    if (newId) setSearchParams({ id: newId })
    else setSearchParams({})
  }

  return (
    <DashboardLayout title="Subjects">
      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subjects..."
                className="w-full pl-9 pr-4 h-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <p className="text-sm text-muted-foreground shrink-0">{filtered?.length || 0} subjects</p>
            {isTeacher && (
              <Button onClick={() => setShowCreate(!showCreate)} size="sm" className="shrink-0">
                <Plus className="h-4 w-4" /> New Subject
              </Button>
            )}
          </div>

          <AnimatePresence>
            {showCreate && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Card className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Create Subject</h3>
                    <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Subject Name <span className="text-destructive">*</span></label>
                      <input className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Data Structures" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Subject Code <span className="text-destructive">*</span></label>
                      <input className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. CS301" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Semester <span className="text-destructive">*</span></label>
                      <select className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                        <option value="">Select semester...</option>
                        {semesters?.results?.map((s) => <option key={s.id} value={s.id}>Semester {s.number} — {s.department}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Credits</label>
                      <input type="number" min={1} max={6}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1.5 block">Description</label>
                      <input className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button loading={creating} disabled={!form.name || !form.code || !form.semester} onClick={handleCreate}>
                      <Plus className="h-4 w-4" /> Create Subject
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : filtered?.map((subject, i) => (
                  <motion.div key={subject.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card
                      hover
                      onClick={() => handleSelectSubject(subject.id)}
                      className={`space-y-4 cursor-pointer transition-all ${selectedId === subject.id ? 'border-primary/50 bg-primary/5 shadow-md' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${selectedId === subject.id ? 'from-primary to-primary/70' : 'from-blue-500 to-indigo-600'} flex items-center justify-center transition-all`}>
                          <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <Badge variant="secondary" className="text-xs">{subject.credits} cr</Badge>
                      </div>
                      <div>
                        <h3 className="font-semibold">{subject.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Hash className="h-3 w-3" />{subject.code}</p>
                        {subject.teacher_name && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Users className="h-3 w-3" />{subject.teacher_name}</p>}
                        {subject.description && (
                          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{subject.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />{subject.materials_count || 0} materials
                        </span>
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Link to={`${basePath}/materials?subject=${subject.id}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Materials</Button>
                          </Link>
                          <Link to={`${basePath}/chat?subject=${subject.id}`}>
                            <Button size="sm" className="h-7 px-2 text-xs">
                              <MessageSquare className="h-3 w-3" /> Chat
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
            {!isLoading && !filtered?.length && (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>{search ? 'No subjects match your search.' : 'No subjects available yet.'}</p>
                {isTeacher && !search && <p className="text-sm mt-1">Create the first subject to get started.</p>}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {selectedId && (
            <SubjectDetailPanel
              subjectId={selectedId}
              basePath={basePath}
              onClose={() => { setSelectedId(null); setSearchParams({}) }}
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  )
}
