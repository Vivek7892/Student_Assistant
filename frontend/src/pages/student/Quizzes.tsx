import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Plus, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Button, Badge } from '@/components/ui'
import { useQuizzes, useGenerateQuiz, useSubmitQuiz } from '@/api/ai'
import { useMaterials } from '@/api/courses'
import { getDifficultyColor, formatDate } from '@/lib/utils'
import { Quiz, QuizQuestion } from '@/types'

export default function QuizzesPage() {
  const [view, setView] = useState<'list' | 'quiz' | 'result'>('list')
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Array<{ selected: string }>>([])
  const [result, setResult] = useState<any>(null)
  const [showGenerate, setShowGenerate] = useState(false)
  const [genConfig, setGenConfig] = useState({ material_id: '', num_questions: 10, difficulty: 'medium' })

  const { data: quizzes } = useQuizzes()
  const { data: materials } = useMaterials()
  const { mutate: generateQuiz, isPending: generating } = useGenerateQuiz()
  const { mutate: submitQuiz, isPending: submitting } = useSubmitQuiz()

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz)
    setCurrentQ(0)
    setAnswers(Array(quiz.questions.length).fill({ selected: '' }))
    setView('quiz')
  }

  const selectAnswer = (option: string) => {
    const newAnswers = [...answers]
    newAnswers[currentQ] = { selected: option.charAt(0) }
    setAnswers(newAnswers)
  }

  const handleSubmit = () => {
    if (!activeQuiz) return
    submitQuiz(
      { quizId: activeQuiz.id, answers, time_taken_seconds: 0 },
      { onSuccess: (data) => { setResult(data); setView('result') } }
    )
  }

  if (view === 'quiz' && activeQuiz) {
    const q: QuizQuestion = activeQuiz.questions[currentQ]
    return (
      <DashboardLayout title="Quiz">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{currentQ + 1} / {activeQuiz.questions.length}</span>
            <div className="flex-1 mx-4 bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${((currentQ + 1) / activeQuiz.questions.length) * 100}%` }} />
            </div>
            <Badge variant={activeQuiz.difficulty === 'easy' ? 'success' : activeQuiz.difficulty === 'hard' ? 'destructive' : 'warning'} className="capitalize">
              {activeQuiz.difficulty}
            </Badge>
          </div>

          <Card>
            <h3 className="text-lg font-semibold mb-6">{q.question}</h3>
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => selectAnswer(opt)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium ${
                    answers[currentQ]?.selected === opt.charAt(0)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            {currentQ < activeQuiz.questions.length - 1 ? (
              <Button onClick={() => setCurrentQ(currentQ + 1)} disabled={!answers[currentQ]?.selected}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting}>
                Submit Quiz
              </Button>
            )}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (view === 'result' && result) {
    return (
      <DashboardLayout title="Quiz Results">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className={`h-24 w-24 rounded-full mx-auto flex items-center justify-center text-3xl font-black ${result.score >= 70 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
            {result.score.toFixed(0)}%
          </div>
          <div>
            <h2 className="text-2xl font-bold">{result.score >= 70 ? 'Great job! 🎉' : 'Keep practicing! 💪'}</h2>
            <p className="text-muted-foreground mt-1">You scored {result.score.toFixed(0)}% on this quiz</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="text-center"><p className="text-2xl font-bold text-green-500">{Math.round((result.score / 100) * result.total_questions)}</p><p className="text-xs text-muted-foreground">Correct</p></Card>
            <Card className="text-center"><p className="text-2xl font-bold text-red-500">{result.total_questions - Math.round((result.score / 100) * result.total_questions)}</p><p className="text-xs text-muted-foreground">Incorrect</p></Card>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setView('list'); setResult(null) }}>Back to Quizzes</Button>
            <Button className="flex-1" onClick={() => startQuiz(activeQuiz!)}>Retry</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Quizzes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">{quizzes?.count || 0} quizzes available</p>
          <Button onClick={() => setShowGenerate(!showGenerate)}>
            <Plus className="h-4 w-4" /> Generate Quiz
          </Button>
        </div>

        {/* Generate form */}
        <AnimatePresence>
          {showGenerate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Card className="space-y-4">
                <h3 className="font-semibold">AI Quiz Generator</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Study Material</label>
                    <select
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setGenConfig({ ...genConfig, material_id: e.target.value })}
                    >
                      <option value="">Select material...</option>
                      {materials?.results?.filter(m => m.is_processed).map(m => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Questions</label>
                    <select className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setGenConfig({ ...genConfig, num_questions: +e.target.value })}>
                      {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} questions</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Difficulty</label>
                    <select className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setGenConfig({ ...genConfig, difficulty: e.target.value })}>
                      {['easy', 'medium', 'hard'].map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
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

        {/* Quiz list */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes?.results?.map((quiz, i) => (
            <motion.div key={quiz.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card hover className="space-y-3">
                <div className="flex items-start justify-between">
                  <Badge className={getDifficultyColor(quiz.difficulty)}>{quiz.difficulty}</Badge>
                  {quiz.is_ai_generated && <Badge variant="default" className="text-xs">AI</Badge>}
                </div>
                <h3 className="font-semibold">{quiz.title}</h3>
                <p className="text-sm text-muted-foreground">{quiz.questions.length} questions · {quiz.time_limit_minutes} min</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(quiz.created_at)}</span>
                  <Button size="sm" onClick={() => startQuiz(quiz)}>Start Quiz</Button>
                </div>
              </Card>
            </motion.div>
          ))}
          {!quizzes?.results?.length && (
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
