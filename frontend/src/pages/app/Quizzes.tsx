import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, Clock, Trophy, ChevronLeft,
  Zap, Brain, X, FileText, AlertCircle, RotateCcw, History,
} from 'lucide-react'
import { Card, Badge, Button, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

type QuizState = 'list' | 'running' | 'result'

interface Material { id: string; title: string; file_type: string; is_processed: boolean }
interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: string | number
  explanation?: string
}
interface Quiz {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  questions: QuizQuestion[]
  attempts_count: number
  created_at: string
  material?: string
}
interface Attempt {
  id: string
  score: number
  total_questions: number
  time_taken_seconds: number
  completed_at: string
}

function correctIndex(q: QuizQuestion): number {
  if (typeof q.correct_answer === 'number') return q.correct_answer
  const idx = 'ABCD'.indexOf(q.correct_answer ?? 'A')
  return idx >= 0 ? idx : 0
}

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function Quizzes() {
  const [quizzes,    setQuizzes]    = useState<Quiz[]>([])
  const [loading,    setLoading]    = useState(true)
  const [state,      setState]      = useState<QuizState>('list')
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [qIndex,     setQIndex]     = useState(0)
  const [selected,   setSelected]   = useState<number | null>(null)
  const [answers,    setAnswers]     = useState<number[]>([])
  const [revealed,   setRevealed]   = useState(false)
  const [timer,      setTimer]      = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Generate modal
  const [showGen,    setShowGen]    = useState(false)
  const [materials,  setMaterials]  = useState<Material[]>([])
  const [genForm,    setGenForm]    = useState({ material_id: '', num_questions: '5', difficulty: 'medium', title: '' })
  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState('')

  // History modal
  const [historyQuiz,    setHistoryQuiz]    = useState<Quiz | null>(null)
  const [attempts,       setAttempts]       = useState<Attempt[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchQuizzes()
    api.get('/api/courses/materials/?page_size=100')
      .then(r => setMaterials(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => {})
  }, [])

  function fetchQuizzes() {
    setLoading(true)
    api.get('/api/ai/quizzes/')
      .then(r => setQuizzes(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false))
  }

  // Timer
  useEffect(() => {
    if (state === 'running') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state])

  async function generateQuiz() {
    if (!genForm.material_id) { setGenError('Select a document'); return }
    setGenerating(true); setGenError('')
    try {
      const r = await api.post('/api/ai/quizzes/generate/', {
        material_id:   genForm.material_id,
        num_questions: parseInt(genForm.num_questions) || 5,
        difficulty:    genForm.difficulty,
        title:         genForm.title || undefined,
      })
      setQuizzes(q => [r.data, ...q])
      setShowGen(false)
      setGenForm({ material_id: '', num_questions: '5', difficulty: 'medium', title: '' })
    } catch (e: any) {
      setGenError(e?.response?.data?.error ?? 'Generation failed. Make sure the document is processed.')
    } finally {
      setGenerating(false)
    }
  }

  function startQuiz(quiz: Quiz) {
    if (!quiz.questions?.length) return
    setActiveQuiz(quiz)
    setQIndex(0); setSelected(null); setAnswers([]); setRevealed(false); setTimer(0)
    setState('running')
  }

  function confirm() {
    if (selected === null) return
    setRevealed(true)
    setAnswers(a => [...a, selected])
  }

  async function next() {
    if (!activeQuiz) return
    const isLast = qIndex + 1 >= activeQuiz.questions.length
    if (isLast) {
      // Submit attempt to backend
      setSubmitting(true)
      try {
        const payload = {
          answers: answers.map((sel, i) => ({ question_index: i, selected: sel })),
          time_taken_seconds: timer,
        }
        await api.post(`/api/ai/quizzes/${activeQuiz.id}/submit/`, payload)
        // Refresh quiz list to update attempts_count
        fetchQuizzes()
      } catch { /* non-critical */ } finally {
        setSubmitting(false)
      }
      setState('result')
    } else {
      setQIndex(i => i + 1); setSelected(null); setRevealed(false)
    }
  }

  async function openHistory(quiz: Quiz) {
    setHistoryQuiz(quiz)
    setLoadingHistory(true)
    try {
      // Filter attempts by quiz via query param
      const r = await api.get(`/api/ai/quizzes/${quiz.id}/attempts/`)
      setAttempts(Array.isArray(r.data) ? r.data : r.data?.results ?? [])
    } catch {
      setAttempts([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const q = activeQuiz?.questions?.[qIndex]
  const score = answers.filter((a, i) => a === correctIndex(activeQuiz!.questions[i])).length
  const pct   = activeQuiz?.questions?.length ? Math.round((score / activeQuiz.questions.length) * 100) : 0

  // ── Running state ──────────────────────────────────────────────────────────
  if (state === 'running' && q && activeQuiz) {
    const corrIdx = correctIndex(q)
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setState('list')}>
            <ChevronLeft size={16} /> Exit
          </Button>
          <div className="flex items-center gap-3 text-sm text-[var(--text-2)]">
            <span>{qIndex + 1} / {activeQuiz.questions.length}</span>
            <span className="flex items-center gap-1"><Clock size={14} />{fmtTime(timer)}</span>
          </div>
        </div>

        <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${((qIndex + (revealed ? 1 : 0)) / activeQuiz.questions.length) * 100}%` }}
            className="h-full bg-gradient-primary rounded-full transition-all"
          />
        </div>

        <Card className="p-6 space-y-6">
          <p className="font-display font-semibold text-[var(--text-1)] text-base leading-relaxed">
            {q.question}
          </p>

          <div className="space-y-2.5">
            {(q.options ?? []).map((opt, i) => {
              const isCorrect  = i === corrIdx
              const isSelected = i === selected
              return (
                <button key={i} onClick={() => !revealed && setSelected(i)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all',
                    !revealed && !isSelected && 'border-[var(--border)] hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20',
                    !revealed && isSelected  && 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300',
                    revealed  && isCorrect   && 'border-emerald-400 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400',
                    revealed  && isSelected && !isCorrect && 'border-rose-400 bg-rose-400/10 text-rose-600 dark:text-rose-400',
                    revealed  && !isSelected && !isCorrect && 'border-[var(--border)] opacity-40',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {revealed && isCorrect   && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                    {revealed && isSelected && !isCorrect && <XCircle size={16} className="text-rose-500 shrink-0" />}
                  </div>
                </button>
              )
            })}
          </div>

          {revealed && q.explanation && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
            >
              <p className="text-xs text-[var(--text-2)] leading-relaxed">
                <strong>Explanation:</strong> {q.explanation}
              </p>
            </motion.div>
          )}

          <div className="flex justify-end">
            {!revealed
              ? <Button variant="gradient" onClick={confirm} disabled={selected === null}>Confirm Answer</Button>
              : <Button variant="gradient" onClick={next} disabled={submitting}>
                  {qIndex + 1 >= activeQuiz.questions.length
                    ? (submitting ? 'Saving…' : 'See Results')
                    : 'Next Question'}
                </Button>
            }
          </div>
        </Card>
      </div>
    )
  }

  // ── Result state ───────────────────────────────────────────────────────────
  if (state === 'result' && activeQuiz) {
    return (
      <div className="max-w-lg mx-auto space-y-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
          <div className="w-20 h-20 rounded-3xl bg-gradient-primary mx-auto flex items-center justify-center shadow-lift mb-4">
            <Trophy size={36} className="text-white" />
          </div>
          <h2 className="font-display text-3xl font-bold text-[var(--text-1)]">{pct}%</h2>
          <p className="text-[var(--text-2)] mt-1">{score} / {activeQuiz.questions.length} correct · {fmtTime(timer)}</p>
          <Badge color={pct >= 80 ? 'emerald' : pct >= 60 ? 'amber' : 'rose'} className="mt-2">
            {pct >= 80 ? '🎉 Excellent!' : pct >= 60 ? '👍 Good job!' : '📚 Keep practicing'}
          </Badge>
        </motion.div>

        {/* Per-question review */}
        <div className="space-y-2 text-left">
          {activeQuiz.questions.map((question, i) => {
            const userAns = answers[i] ?? -1
            const corrIdx = correctIndex(question)
            const isRight = userAns === corrIdx
            return (
              <div key={i} className={cn(
                'p-3 rounded-xl border text-sm',
                isRight ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/10' : 'border-rose-300 bg-rose-50 dark:bg-rose-900/10'
              )}>
                <div className="flex items-start gap-2">
                  {isRight
                    ? <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                    : <XCircle size={15} className="text-rose-500 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-1)] text-xs leading-snug">{question.question}</p>
                    {!isRight && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Correct: {question.options?.[corrIdx]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => setState('list')}>Back to Quizzes</Button>
          <Button variant="gradient" className="gap-1.5" onClick={() => startQuiz(activeQuiz)}>
            <RotateCcw size={14} /> Retry
          </Button>
        </div>
      </div>
    )
  }

  // ── List state ─────────────────────────────────────────────────────────────
  const processedMaterials = materials.filter(m => m.is_processed)
  const unprocessedMaterials = materials.filter(m => !m.is_processed)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-[var(--text-1)]">Quizzes</h2>
        <Button variant="gradient" size="sm" className="gap-2" onClick={() => { setShowGen(true); setGenError('') }}>
          <Zap size={14} /> Generate Quiz
        </Button>
      </div>

      {/* Generate modal */}
      <AnimatePresence>
        {showGen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-[var(--text-1)]">Generate Quiz with AI</h3>
                <button onClick={() => setShowGen(false)} className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-2)]">
                  <X size={16} />
                </button>
              </div>

              {genError && (
                <div className="flex items-start gap-2 text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {genError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--text-3)] mb-1 block">Document</label>
                  <select
                    value={genForm.material_id}
                    onChange={e => setGenForm(f => ({ ...f, material_id: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  >
                    <option value="">Select a document…</option>
                    {processedMaterials.length > 0 && (
                      <optgroup label="Ready for AI">
                        {processedMaterials.map(m => (
                          <option key={m.id} value={m.id}>{m.title} ({m.file_type.toUpperCase()})</option>
                        ))}
                      </optgroup>
                    )}
                    {unprocessedMaterials.length > 0 && (
                      <optgroup label="All Documents">
                        {unprocessedMaterials.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.title} ({m.file_type.toUpperCase()})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {materials.length === 0 && (
                    <p className="text-xs text-[var(--text-3)] mt-1 flex items-center gap-1">
                      <FileText size={12} /> Upload documents from the Documents page first
                    </p>
                  )}

                </div>

                <input
                  value={genForm.title}
                  onChange={e => setGenForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Quiz title (optional)"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-3)] mb-1 block">Questions</label>
                    <select
                      value={genForm.num_questions}
                      onChange={e => setGenForm(f => ({ ...f, num_questions: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    >
                      {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-3)] mb-1 block">Difficulty</label>
                    <select
                      value={genForm.difficulty}
                      onChange={e => setGenForm(f => ({ ...f, difficulty: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setShowGen(false)}>Cancel</Button>
                <Button
                  variant="gradient" size="sm"
                  onClick={generateQuiz}
                  disabled={generating || !genForm.material_id}
                >
                  {generating ? 'Generating…' : 'Generate'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History modal */}
      <AnimatePresence>
        {historyQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-[var(--text-1)] text-sm">{historyQuiz.title}</h3>
                <button onClick={() => setHistoryQuiz(null)} className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-2)]">
                  <X size={16} />
                </button>
              </div>
              {loadingHistory ? (
                <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
              ) : attempts.length === 0 ? (
                <p className="text-sm text-[var(--text-3)] text-center py-4">No attempts yet</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {attempts.map((a, i) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--surface-2)] text-sm">
                      <span className="text-[var(--text-3)] text-xs">#{attempts.length - i}</span>
                      <span className={cn(
                        'font-semibold',
                        a.score >= 80 ? 'text-emerald-500' : a.score >= 60 ? 'text-amber-500' : 'text-rose-500'
                      )}>{Math.round(a.score)}%</span>
                      <span className="text-[var(--text-3)] text-xs">{fmtTime(a.time_taken_seconds)}</span>
                      <span className="text-[var(--text-3)] text-xs">
                        {new Date(a.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quiz list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="p-12 text-center">
          <Brain size={32} className="mx-auto text-[var(--text-3)] mb-3" />
          <p className="text-sm font-medium text-[var(--text-2)]">No quizzes yet</p>
          <p className="text-xs text-[var(--text-3)] mt-1">Upload study materials and generate a quiz from your documents</p>
          <Button variant="gradient" size="sm" className="mt-4 gap-1.5" onClick={() => { setShowGen(true); setGenError('') }}>
            <Zap size={13} /> Generate from Document
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map(quiz => (
            <Card key={quiz.id} hover className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Badge color={quiz.difficulty === 'hard' ? 'rose' : quiz.difficulty === 'medium' ? 'amber' : 'emerald'}>
                    {quiz.difficulty}
                  </Badge>
                  <h3 className="font-display font-semibold text-[var(--text-1)] mt-2 text-sm leading-snug line-clamp-2">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-[var(--text-3)] mt-1">
                    {quiz.questions?.length ?? 0} questions
                    {quiz.attempts_count > 0 && ` · ${quiz.attempts_count} attempt${quiz.attempts_count > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <Button
                  variant={quiz.questions?.length ? 'gradient' : 'secondary'}
                  size="sm"
                  className="flex-1"
                  onClick={() => startQuiz(quiz)}
                  disabled={!quiz.questions?.length}
                >
                  {quiz.questions?.length ? 'Start Quiz' : 'No questions'}
                </Button>
                {quiz.attempts_count > 0 && (
                  <Button
                    variant="secondary" size="sm"
                    className="px-2.5"
                    onClick={() => openHistory(quiz)}
                    title="View attempt history"
                  >
                    <History size={14} />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  )
}
