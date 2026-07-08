import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, GraduationCap, Sparkles, Trash2 } from 'lucide-react'
import { Badge, Button, Card } from '../../components/ui'
import { api } from '../../lib/api'

interface Material { id: string; title: string; file_name: string; subject_name?: string }
interface QuizQuestion { question: string; options: string[]; correct_answer: string | number; explanation?: string }
interface Quiz { id: string; title: string; difficulty: string; questions: QuizQuestion[]; created_at: string; material?: string }

export default function Quizzes() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [materialId, setMaterialId] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [count, setCount] = useState(5)
  const [active, setActive] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [generating, setGenerating] = useState(false)

  async function load() {
    const [matRes, quizRes] = await Promise.all([
      api.get('/api/courses/materials/'),
      api.get('/api/ai/quizzes/'),
    ])
    const mats = Array.isArray(matRes.data) ? matRes.data : matRes.data.results ?? []
    setMaterials(mats)
    setMaterialId(current => current || mats[0]?.id || '')
    setQuizzes(Array.isArray(quizRes.data) ? quizRes.data : quizRes.data.results ?? [])
  }

  useEffect(() => { load() }, [])

  const score = useMemo(() => {
    if (!active) return null
    return active.questions.reduce((total, q, index) => {
      const selected = answers[index]
      const correct = typeof q.correct_answer === 'number' ? q.correct_answer : 'ABCD'.indexOf(q.correct_answer)
      return total + (selected === correct ? 1 : 0)
    }, 0)
  }, [active, answers])

  async function generate() {
    if (!materialId) return
    setGenerating(true)
    try {
      const res = await api.post('/api/ai/quizzes/generate/', { material_id: materialId, num_questions: count, difficulty })
      setQuizzes(current => [res.data, ...current])
      setActive(res.data)
      setAnswers({})
    } finally {
      setGenerating(false)
    }
  }

  async function remove(id: string) {
    await api.delete(`/api/ai/quizzes/${id}/`)
    setQuizzes(current => current.filter(quiz => quiz.id !== id))
    if (active?.id === id) setActive(null)
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div>
        <h2 className="font-display text-xl font-bold">Document Quizzes</h2>
        <p className="text-sm text-[var(--text-2)]">Generate and save MCQs from uploaded study materials.</p>
      </div>

      <Card className="grid gap-3 p-4 md:grid-cols-5">
        <select value={materialId} onChange={e => setMaterialId(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm md:col-span-2">
          {materials.map(material => <option key={material.id} value={material.id}>{material.title || material.file_name}</option>)}
        </select>
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"><option>easy</option><option>medium</option><option>hard</option></select>
        <input type="number" min={1} max={30} value={count} onChange={e => setCount(Number(e.target.value))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
        <Button variant="gradient" disabled={!materialId || generating} onClick={generate}><Sparkles size={15} /> {generating ? 'Generating...' : 'Generate'}</Button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          {quizzes.map(quiz => (
            <Card key={quiz.id} hover className="p-3" onClick={() => { setActive(quiz); setAnswers({}) }}>
              <div className="flex items-start gap-2">
                <GraduationCap size={16} className="text-primary-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{quiz.title}</p>
                  <p className="text-xs text-[var(--text-3)]">{quiz.questions?.length || 0} questions</p>
                </div>
                <button onClick={e => { e.stopPropagation(); remove(quiz.id) }} className="text-[var(--text-3)] hover:text-rose-500"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          {!active ? (
            <p className="text-sm text-[var(--text-2)]">Choose a saved quiz or generate one from a material.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold">{active.title}</h3>
                <Badge>{active.difficulty}</Badge>
                {score !== null && Object.keys(answers).length === active.questions.length && <Badge color="emerald"><CheckCircle2 size={12} /> {score}/{active.questions.length}</Badge>}
              </div>
              {active.questions.map((q, index) => {
                const selected = answers[index]
                const correct = typeof q.correct_answer === 'number' ? q.correct_answer : 'ABCD'.indexOf(q.correct_answer)
                return (
                  <div key={`${active.id}-${index}`} className="rounded-xl bg-[var(--surface-2)] p-4">
                    <p className="font-medium">{index + 1}. {q.question}</p>
                    <div className="mt-3 grid gap-2">
                      {q.options.map((option, optionIndex) => (
                        <button key={option} onClick={() => setAnswers(a => ({ ...a, [index]: optionIndex }))} className={`rounded-xl border p-3 text-left text-sm ${selected === optionIndex ? (optionIndex === correct ? 'border-emerald-400 bg-emerald-400/10' : 'border-rose-400 bg-rose-400/10') : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                          {option}
                        </button>
                      ))}
                    </div>
                    {selected !== undefined && q.explanation && <p className="mt-3 text-sm text-[var(--text-2)]">{q.explanation}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
