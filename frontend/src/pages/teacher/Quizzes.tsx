import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Plus, X, Trash2, Eye } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Button, Badge } from '@/components/ui'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useQuizzes, useGenerateQuiz } from '@/api/ai'
import { useMaterials } from '@/api/courses'
import { getDifficultyColor, formatDate } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function TeacherQuizzes() {
  const [showGenerate, setShowGenerate] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [genConfig, setGenConfig] = useState({ material_id: '', num_questions: 10, difficulty: 'medium', title: '' })

  const { data: quizzes, isLoading } = useQuizzes()
  const { data: materials } = useMaterials()
  const { mutate: generateQuiz, isPending: generating } = useGenerateQuiz()
  const qc = useQueryClient()

  const { mutate: deleteQuiz } = useMutation({
    mutationFn: (id: string) => api.delete(`/ai/quizzes/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quizzes'] }); toast.success('Quiz deleted') },
  })

  const { mutate: togglePublish } = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api.patch(`/ai/quizzes/${id}/`, { is_published: !published }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  })

  return (
    <DashboardLayout title="Quizzes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">{quizzes?.count || 0} quizzes</p>
          <Button onClick={() => setShowGenerate(!showGenerate)}>
            <Plus className="h-4 w-4" /> Generate Quiz
          </Button>
        </div>

        <AnimatePresence>
          {showGenerate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> AI Quiz Generator</h3>
                  <button onClick={() => setShowGenerate(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Study Material</label>
                    <select className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setGenConfig({ ...genConfig, material_id: e.target.value })}>
                      <option value="">Select material...</option>
                      {materials?.results?.filter((m) => m.is_processed).map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Quiz Title (optional)</label>
                    <input className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Auto-generated if empty"
                      onChange={(e) => setGenConfig({ ...genConfig, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Questions</label>
                    <select className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setGenConfig({ ...genConfig, num_questions: +e.target.value })}>
                      {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} questions</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Difficulty</label>
                    <select className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setGenConfig({ ...genConfig, difficulty: e.target.value })}>
                      {['easy', 'medium', 'hard'].map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
                    </select>
                  </div>
                </div>
                <Button
                  onClick={() => generateQuiz(genConfig, { onSuccess: () => setShowGenerate(false) })}
                  loading={generating}
                  disabled={!genConfig.material_id}
                >
                  <Brain className="h-4 w-4" /> Generate with AI
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz preview modal */}
        <AnimatePresence>
          {preview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <Card className="space-y-4">
                  <div className="flex items-center justify-between sticky top-0 bg-card pb-2 border-b border-border">
                    <h3 className="font-semibold">{preview.title}</h3>
                    <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                  </div>
                  {preview.questions.map((q: any, i: number) => (
                    <div key={i} className="space-y-2">
                      <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt: string, j: number) => (
                          <div key={j} className={`text-xs p-2 rounded-lg border ${opt.charAt(0) === q.correct_answer ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400' : 'border-border bg-muted/30'}`}>
                            {opt}
                          </div>
                        ))}
                      </div>
                      {q.explanation && <p className="text-xs text-muted-foreground italic">💡 {q.explanation}</p>}
                    </div>
                  ))}
                </Card>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : quizzes?.results?.map((quiz: any, i: number) => (
                <motion.div key={quiz.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge className={getDifficultyColor(quiz.difficulty)}>{quiz.difficulty}</Badge>
                      <div className="flex items-center gap-1">
                        {quiz.is_ai_generated && <Badge variant="default" className="text-xs">AI</Badge>}
                        <button onClick={() => setPreview(quiz)} className="text-muted-foreground hover:text-foreground p-1">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteQuiz(quiz.id)} className="text-muted-foreground hover:text-destructive p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-semibold">{quiz.title}</h3>
                    <p className="text-sm text-muted-foreground">{quiz.questions.length} questions · {quiz.attempts_count} attempts</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{formatDate(quiz.created_at)}</span>
                      <Button
                        size="sm"
                        variant={quiz.is_published ? 'outline' : 'default'}
                        onClick={() => togglePublish({ id: quiz.id, published: quiz.is_published })}
                      >
                        {quiz.is_published ? 'Unpublish' : 'Publish'}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
          {!isLoading && !quizzes?.results?.length && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No quizzes yet. Generate one with AI!</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
