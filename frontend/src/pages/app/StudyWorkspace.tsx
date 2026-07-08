import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, BarChart3, BookOpen, CalendarDays, Check, ChevronLeft, Clock, CopyPlus,
  FileText, Flame, GraduationCap, Heart, Layers, Pause, Pin, Play, Plus, RefreshCw,
  RotateCcw, Search, Sparkles, Star, Target, TimerReset, Trash2, Upload, X,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, Input } from '../../components/ui'
import { cn, colorMap, daysUntil, formatDate } from '../../lib/utils'
import {
  Document, Difficulty, FlashcardDeck, Note, PlanTask, QuizQuestion, SubjectColor,
  useStudyStore,
} from '../../store/studyStore'

const subjects: Array<{ name: string; color: SubjectColor }> = [
  { name: 'General', color: 'primary' },
  { name: 'Computer Science', color: 'primary' },
  { name: 'Physics', color: 'cyan' },
  { name: 'Chemistry', color: 'emerald' },
  { name: 'Math', color: 'amber' },
  { name: 'Biology', color: 'rose' },
]

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }
const today = () => new Date().toISOString().slice(0, 10)
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`

function tone(subject: string): SubjectColor {
  return subjects.find(s => s.name === subject)?.color || 'primary'
}

function words(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function stripMarkdown(text: string) {
  return text.replace(/[#*_`>\-[\]()]/g, '').replace(/\s+/g, ' ').trim()
}

function markdownBlocks(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h3 key={i} className="mt-3 font-display text-base font-semibold">{line.slice(3)}</h3>
    if (line.startsWith('# ')) return <h2 key={i} className="font-display text-lg font-semibold">{line.slice(2)}</h2>
    if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc text-sm text-[var(--text-2)]">{line.slice(2)}</li>
    return <p key={i} className="text-sm leading-relaxed text-[var(--text-2)]">{line || '\u00a0'}</p>
  })
}

function Chip({ active, color = 'primary', children, onClick }: { active?: boolean; color?: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
      active ? colorMap[color]?.soft : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)]',
    )}>
      {children}
    </button>
  )
}

function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
              <h3 className="min-w-0 flex-1 truncate font-display text-base font-semibold text-[var(--text-1)]">{title}</h3>
              <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-2)] hover:bg-[var(--surface-2)]"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function NotesPage() {
  const { notes, addNote, updateNote, deleteNote } = useStudyStore()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('All')
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id || null)
  const active = notes.find(n => n.id === activeId)
  const filtered = notes
    .filter(n => subject === 'All' || n.subject === subject)
    .filter(n => `${n.title} ${n.subject} ${n.tags.join(' ')} ${n.content}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || +new Date(b.updatedAt) - +new Date(a.updatedAt))

  function create() {
    setActiveId(addNote({ subject: subject === 'All' ? 'General' : subject, color: tone(subject) }))
  }

  return (
    <motion.div {...fade} className="space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--text-1)]">Notes Library</h2>
          <p className="text-sm text-[var(--text-2)]">Markdown notes, tags, subject chips, and quick search.</p>
        </div>
        <Button variant="gradient" className="sm:ml-auto" onClick={create}><Plus size={15} /> New Note</Button>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="lg:w-72 space-y-3">
          <Input icon={<Search size={14} />} placeholder="Search notes..." value={query} onChange={e => setQuery(e.target.value)} />
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
            <Chip active={subject === 'All'} onClick={() => setSubject('All')}>All</Chip>
            {subjects.map(s => <Chip key={s.name} color={s.color} active={subject === s.name} onClick={() => setSubject(s.name)}>{s.name}</Chip>)}
          </div>
        </div>
        <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(note => (
            <Card key={note.id} hover className="p-4" onClick={() => setActiveId(note.id)}>
              <div className="flex items-start gap-2">
                <Badge color={note.color}>{note.subject}</Badge>
                <div className="ml-auto flex gap-1 text-[var(--text-3)]">
                  {note.pinned && <Pin size={13} />}
                  {note.favorite && <Heart size={13} className="text-rose-500" />}
                </div>
              </div>
              <h3 className="mt-3 line-clamp-1 font-display text-base font-semibold text-[var(--text-1)]">{note.title}</h3>
              <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-[var(--text-2)]">{stripMarkdown(note.content)}</p>
              <div className="mt-3 flex flex-wrap gap-1">{note.tags.map(tag => <span key={tag} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text-3)]">#{tag}</span>)}</div>
              <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-3)]"><span>{words(note.content)} words</span><span>Edited {formatDate(note.updatedAt)}</span></div>
            </Card>
          ))}
          {filtered.length === 0 && <EmptyState icon={BookOpen} title="No notes found" body="Create a note or adjust your filters." />}
        </div>
      </div>
      <Drawer open={!!active} title={active?.title || 'Edit note'} onClose={() => setActiveId(null)}>
        {active && <NoteEditor note={active} updateNote={updateNote} deleteNote={deleteNote} close={() => setActiveId(null)} />}
      </Drawer>
    </motion.div>
  )
}

function NoteEditor({ note, updateNote, deleteNote, close }: { note: Note; updateNote: (id: string, patch: Partial<Note>) => void; deleteNote: (id: string) => void; close: () => void }) {
  return (
    <div className="space-y-4">
      <input value={note.title} onChange={e => updateNote(note.id, { title: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-display text-lg font-semibold outline-none focus:border-primary-400" />
      <div className="grid grid-cols-2 gap-2">
        <select value={note.subject} onChange={e => updateNote(note.id, { subject: e.target.value, color: tone(e.target.value) })} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
          {subjects.map(s => <option key={s.name}>{s.name}</option>)}
        </select>
        <input value={note.tags.join(', ')} onChange={e => updateNote(note.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="tags" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none" />
      </div>
      <div className="flex gap-2">
        <Button variant={note.pinned ? 'gradient' : 'secondary'} size="sm" onClick={() => updateNote(note.id, { pinned: !note.pinned })}><Pin size={14} /> Pin</Button>
        <Button variant={note.favorite ? 'gradient' : 'secondary'} size="sm" onClick={() => updateNote(note.id, { favorite: !note.favorite })}><Heart size={14} /> Favorite</Button>
        <Button variant="ghost" size="sm" className="ml-auto text-rose-500" onClick={() => { deleteNote(note.id); close() }}><Trash2 size={14} /> Delete</Button>
      </div>
      <textarea value={note.content} onChange={e => updateNote(note.id, { content: e.target.value })} rows={12} className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 font-mono text-sm text-[var(--text-1)] outline-none focus:border-primary-400" />
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">{markdownBlocks(note.content)}</div>
    </div>
  )
}

function useLocalDropzone(onDrop: (files: File[]) => void) {
  const [drag, setDrag] = useState(false)
  return {
    drag,
    rootProps: {
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDrag(true) },
      onDragLeave: () => setDrag(false),
      onDrop: (e: React.DragEvent) => { e.preventDefault(); setDrag(false); onDrop(Array.from(e.dataTransfer.files)) },
    },
  }
}

export function DocumentsPage() {
  const { documents, addDocuments, deleteDocument, addDeck } = useStudyStore()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('All')
  const [active, setActive] = useState<Document | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const subjectList = ['All', ...Array.from(new Set(documents.map(d => d.subject)))]
  const filtered = documents.filter(d => (subject === 'All' || d.subject === subject) && `${d.title} ${d.subject}`.toLowerCase().includes(query.toLowerCase()))
  const dropzone = useLocalDropzone(handleFiles)

  function handleFiles(files: File[]) {
    const allowed = ['pdf', 'docx', 'txt', 'md']
    const accepted = files.filter(f => allowed.includes((f.name.split('.').pop() || '').toLowerCase()) && f.size <= 20 * 1024 * 1024)
    addDocuments(accepted.map(file => {
      const type = (file.name.split('.').pop() || 'txt').toLowerCase() as Document['type']
      const wordCount = Math.max(240, Math.round(file.size / 8))
      return {
        id: uid('doc'),
        title: file.name.replace(/\.[^.]+$/, ''),
        subject: subject === 'All' ? 'General' : subject,
        color: tone(subject === 'All' ? 'General' : subject),
        type,
        size: file.size,
        pageCount: type === 'pdf' ? Math.max(1, Math.round(file.size / 75000)) : Math.max(1, Math.round(wordCount / 450)),
        wordCount,
        uploadedAt: new Date().toISOString(),
        summary: `AI summary for ${file.name}: key concepts were extracted into a concise review plan. Use this file to generate flashcards or a quiz for targeted practice.`,
      }
    }))
  }

  return (
    <motion.div {...fade} className="space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div>
          <h2 className="font-display text-xl font-bold">Document Manager</h2>
          <p className="text-sm text-[var(--text-2)]">PDF, DOCX, TXT, and MD uploads up to 20MB.</p>
        </div>
        <div className="lg:ml-auto flex min-w-0 flex-1 gap-2 lg:max-w-xl">
          <Input icon={<Search size={14} />} placeholder="Search documents..." value={query} onChange={e => setQuery(e.target.value)} />
          <Button variant="gradient" onClick={() => inputRef.current?.click()}><Upload size={15} /> Upload</Button>
          <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.txt,.md" className="hidden" onChange={e => handleFiles(Array.from(e.target.files || []))} />
        </div>
      </div>
      <div {...dropzone.rootProps} onClick={() => inputRef.current?.click()} className={cn('rounded-2xl border-2 border-dashed p-6 text-center transition-colors', dropzone.drag ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]')}>
        <Upload className="mx-auto text-[var(--text-3)]" size={24} />
        <p className="mt-2 text-sm font-medium text-[var(--text-1)]">Drop documents here or tap to browse</p>
        <p className="text-xs text-[var(--text-3)]">PDF, DOCX, TXT, MD - max 20MB</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">{subjectList.map(s => <Chip key={s} active={subject === s} color={tone(s)} onClick={() => setSubject(s)}>{s}</Chip>)}</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(doc => (
          <Card key={doc.id} hover className="p-4" onClick={() => setActive(doc)}>
            <div className="flex items-start gap-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colorMap[doc.color]?.soft)}><FileText size={18} /></div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-base font-semibold">{doc.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5"><Badge color={doc.color}>{doc.subject}</Badge><span className="text-xs uppercase text-[var(--text-3)]">{doc.type}</span></div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <Mini label="Pages" value={doc.pageCount} /><Mini label="Words" value={doc.wordCount} /><Mini label="Uploaded" value={formatDate(doc.uploadedAt)} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); setActive(doc) }}><Sparkles size={13} /> Summary</Button>
              <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); addDeck({ title: `${doc.title} Cards`, subject: doc.subject, color: doc.color }, sampleCards(doc.title)) }}><CopyPlus size={13} /> Cards</Button>
              <Button size="sm" variant="secondary" onClick={e => e.stopPropagation()}><GraduationCap size={13} /> Quiz</Button>
              <Button size="sm" variant="ghost" className="text-rose-500" onClick={e => { e.stopPropagation(); deleteDocument(doc.id) }}><Trash2 size={13} /> Delete</Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <EmptyState icon={FileText} title="No documents" body="Upload files or clear the current filter." />}
      </div>
      <Drawer open={!!active} title={active?.title || 'Summary'} onClose={() => setActive(null)}>
        {active && <div className="space-y-4"><Badge color={active.color}>{active.subject}</Badge><p className="text-sm leading-relaxed text-[var(--text-2)]">{active.summary}</p><Button variant="gradient"><Sparkles size={14} /> Regenerate Summary</Button></div>}
      </Drawer>
    </motion.div>
  )
}

function sampleCards(topic: string) {
  return [
    { question: `What is the central idea in ${topic}?`, answer: 'Identify the definition, purpose, and one concrete example.' },
    { question: `Name one likely exam trap for ${topic}.`, answer: 'Confusing similar terms without checking the condition or context.' },
    { question: `How should you revise ${topic}?`, answer: 'Practice recall, solve two examples, then summarize mistakes.' },
  ]
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-[var(--surface-2)] p-2"><p className="font-semibold text-[var(--text-1)]">{value}</p><p className="text-[var(--text-3)]">{label}</p></div>
}

export function QuizPage() {
  const { quizHistory, addQuizHistory } = useStudyStore()
  const [form, setForm] = useState({ subject: 'Computer Science', topic: 'Operating Systems', difficulty: 'medium' as Difficulty, count: 5 })
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [secondsLeft, setSecondsLeft] = useState(45)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const running = questions.length > 0 && idx < questions.length
  const done = questions.length > 0 && idx >= questions.length
  const score = done ? answers.filter((a, i) => a === questions[i].answerIndex).length : 0

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSecondsLeft(s => s <= 1 ? 0 : s - 1), 1000)
    return () => clearInterval(t)
  }, [running, idx])
  useEffect(() => { if (running && secondsLeft === 0) nextAnswer(selected ?? -1) }, [secondsLeft])

  function generate() {
    setQuestions(Array.from({ length: form.count }, (_, i) => makeQuestion(form.subject, form.topic, form.difficulty, i)))
    setIdx(0); setSelected(null); setAnswers([]); setSecondsLeft(45); setStartedAt(Date.now())
  }
  function nextAnswer(answer: number) {
    const nextAnswers = [...answers, answer]
    setAnswers(nextAnswers)
    setSelected(null)
    setSecondsLeft(45)
    if (idx + 1 >= questions.length) {
      addQuizHistory({ id: uid('quiz'), subject: form.subject, topic: form.topic, difficulty: form.difficulty, score: nextAnswers.filter((a, i) => a === questions[i].answerIndex).length, total: questions.length, timeTaken: Math.round((Date.now() - (startedAt || Date.now())) / 1000), date: new Date().toISOString(), answers: nextAnswers, questions })
    }
    setIdx(i => i + 1)
  }

  if (running) {
    const q = questions[idx]
    const progress = ((idx + 1) / questions.length) * 100
    const revealed = selected !== null
    return (
      <motion.div {...fade} className="mx-auto max-w-3xl space-y-5 pb-20 md:pb-0">
        <div className="flex items-center justify-between"><Button variant="ghost" onClick={() => setQuestions([])}><ChevronLeft size={16} /> Exit</Button><Badge color="cyan"><Clock size={12} /> {secondsLeft}s</Badge></div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"><motion.div animate={{ width: `${progress}%` }} className="h-full bg-gradient-primary" /></div>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-[var(--text-3)]">Question {idx + 1} of {questions.length}</p>
          <h2 className="mt-3 font-display text-xl font-semibold">{q.prompt}</h2>
          <div className="mt-5 grid gap-3">
            {q.options.map((option, i) => (
              <button key={option} onClick={() => setSelected(i)} className={cn('rounded-xl border p-3 text-left text-sm transition-colors', selected === i ? (i === q.answerIndex ? 'border-emerald-400 bg-emerald-400/10' : 'border-rose-400 bg-rose-400/10') : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-primary-300')}>
                {option}
              </button>
            ))}
          </div>
          {revealed && <p className="mt-4 rounded-xl bg-[var(--surface-2)] p-3 text-sm text-[var(--text-2)]">{q.explanation}</p>}
          <Button className="mt-5 w-full" variant="gradient" disabled={selected === null} onClick={() => nextAnswer(selected!)}>{idx + 1 === questions.length ? 'Finish Quiz' : 'Next Question'}</Button>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div {...fade} className="space-y-5 pb-20 md:pb-0">
      <div><h2 className="font-display text-xl font-bold">Topic Quiz Generator</h2><p className="text-sm text-[var(--text-2)]">Generate MCQs by subject, topic, difficulty, and count.</p></div>
      {!done ? (
        <Card className="grid gap-3 p-4 md:grid-cols-5">
          <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">{subjects.slice(1).map(s => <option key={s.name}>{s.name}</option>)}</select>
          <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm md:col-span-2" />
          <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Difficulty }))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"><option>easy</option><option>medium</option><option>hard</option></select>
          <Button variant="gradient" onClick={generate}><Sparkles size={15} /> Generate</Button>
          <input type="range" min={3} max={12} value={form.count} onChange={e => setForm(f => ({ ...f, count: Number(e.target.value) }))} className="md:col-span-5" />
          <p className="text-xs text-[var(--text-3)] md:col-span-5">{form.count} questions</p>
        </Card>
      ) : (
        <Results score={score} total={questions.length} answers={answers} questions={questions} timeTaken={quizHistory[0]?.timeTaken || 0} reset={() => setQuestions([])} />
      )}
      <HistoryChart history={quizHistory} />
    </motion.div>
  )
}

function makeQuestion(subject: string, topic: string, difficulty: Difficulty, i: number): QuizQuestion {
  const answerIndex = i % 4
  return {
    id: uid('q'),
    prompt: `${subject}: Which statement best explains ${topic} concept ${i + 1} at ${difficulty} level?`,
    options: ['It defines the key term and its tradeoff.', 'It ignores the core constraint.', 'It only names an unrelated formula.', 'It reverses cause and effect.'],
    answerIndex,
    explanation: 'Instant feedback: review the condition in the question and connect it to the core concept before choosing.',
  }
}

function Results({ score, total, answers, questions, timeTaken, reset }: { score: number; total: number; answers: number[]; questions: QuizQuestion[]; timeTaken: number; reset: () => void }) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><h3 className="font-display text-xl font-bold">Score {score}/{total}</h3><p className="text-sm text-[var(--text-2)]">Time taken: {timeTaken || Math.max(1, total)}s</p></div><Button className="sm:ml-auto" variant="gradient" onClick={reset}><RotateCcw size={15} /> New Quiz</Button></div>
      <div className="mt-5 space-y-3">{questions.map((q, i) => <div key={q.id} className="rounded-xl bg-[var(--surface-2)] p-3 text-sm"><p className="font-medium">{q.prompt}</p><p className={answers[i] === q.answerIndex ? 'text-emerald-500' : 'text-rose-500'}>{answers[i] === q.answerIndex ? 'Correct' : 'Missed'} - answer: {q.options[q.answerIndex]}</p></div>)}</div>
    </Card>
  )
}

function HistoryChart({ history }: { history: ReturnType<typeof useStudyStore.getState>['quizHistory'] }) {
  const data = [...history].reverse().slice(-8).map((h, i) => ({ name: `Q${i + 1}`, score: Math.round((h.score / h.total) * 100) }))
  return <Card className="p-4"><div className="mb-3 flex items-center gap-2"><BarChart3 size={16} /><h3 className="font-display font-semibold">Historical Score Trends</h3></div><div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.length ? data : [{ name: 'Start', score: 0 }]}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="score" stroke="oklch(55% 0.26 290)" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card>
}

export function FlashcardsPage() {
  const { decks, flashcards, documents, addDeck, reviewCard } = useStudyStore()
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(decks[0] || null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const cards = activeDeck ? flashcards.filter(c => activeDeck.cardIds.includes(c.id)) : []
  const card = cards[index]
  const due = flashcards.filter(c => new Date(c.dueAt) <= new Date()).length
  const mastery = flashcards.length ? Math.round(flashcards.filter(c => c.reviewed > 0 && c.ease >= 2.5).length / flashcards.length * 100) : 0

  function rate(rating: 'again' | 'hard' | 'good' | 'easy') {
    if (!card) return
    reviewCard(card.id, rating)
    setFlipped(false)
    setIndex(i => cards.length ? (i + 1) % cards.length : 0)
  }

  return (
    <motion.div {...fade} className="space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><h2 className="font-display text-xl font-bold">Spaced Repetition</h2><p className="text-sm text-[var(--text-2)]">{due} cards due today - {mastery}% mastery</p></div><Button variant="gradient" className="sm:ml-auto" onClick={() => addDeck({ title: 'Generated from Document', subject: documents[0]?.subject || 'General', color: documents[0]?.color || 'primary' }, sampleCards(documents[0]?.title || 'recent document'))}><Sparkles size={15} /> Generate from Document</Button></div>
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          <Button variant="secondary" className="w-full" onClick={() => addDeck({ title: 'New Deck', subject: 'General', color: 'primary' }, sampleCards('new deck'))}><Plus size={15} /> Create Deck</Button>
          {decks.map(deck => <Card key={deck.id} hover className={cn('p-3', activeDeck?.id === deck.id && 'ring-2 ring-primary-500/30')} onClick={() => { setActiveDeck(deck); setIndex(0); setFlipped(false) }}><div className="flex items-center gap-2"><Layers size={16} className={colorMap[deck.color]?.text} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{deck.title}</p><p className="text-xs text-[var(--text-3)]">{deck.cardIds.length} cards - {deck.subject}</p></div></div></Card>)}
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]"><motion.div animate={{ width: `${cards.length ? ((index + 1) / cards.length) * 100 : 0}%` }} className="h-full bg-gradient-primary" /></div><Badge>{cards.length ? `${index + 1}/${cards.length}` : '0/0'}</Badge></div>
          {card ? (
            <>
              <div className="flip-card h-72 cursor-pointer" onClick={() => setFlipped(f => !f)}>
                <div className={cn('flip-card-inner h-full w-full', flipped && 'flipped')}>
                  <Card className="flip-card-front absolute inset-0 flex items-center justify-center p-8 text-center"><div><p className="text-xs uppercase text-[var(--text-3)]">Question</p><h3 className="mt-4 font-display text-xl font-semibold">{card.question}</h3></div></Card>
                  <Card className="flip-card-back absolute inset-0 flex items-center justify-center border-primary-200 bg-primary-50 p-8 text-center dark:bg-primary-900/20"><div><p className="text-xs uppercase text-primary-500">Answer</p><p className="mt-4 text-sm leading-relaxed">{card.answer}</p></div></Card>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['again', 'hard', 'good', 'easy'] as const).map(r => <Button key={r} variant={r === 'easy' ? 'gradient' : 'secondary'} onClick={() => rate(r)}>{r[0].toUpperCase() + r.slice(1)}</Button>)}
              </div>
            </>
          ) : <EmptyState icon={Layers} title="No cards" body="Create a deck or generate cards from a document." />}
        </div>
      </div>
    </motion.div>
  )
}

export function PlannerPage() {
  const { planTasks, setPlanTasks, togglePlanTask } = useStudyStore()
  const [form, setForm] = useState({ examDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), subject: 'Physics', topics: 'Kinematics, Work Energy, Gravitation' })
  const grouped = Object.entries(planTasks.reduce<Record<string, PlanTask[]>>((acc, task) => ({ ...acc, [task.date]: [...(acc[task.date] || []), task] }), {}))

  function generate() {
    const topics = form.topics.split(',').map(t => t.trim()).filter(Boolean)
    const days = Math.max(1, Math.ceil((+new Date(form.examDate) - Date.now()) / 86400000))
    const tasks = Array.from({ length: days }, (_, d) => {
      const date = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
      const topic = topics[d % topics.length] || form.subject
      return [
        { id: uid('plan'), date, subject: form.subject, title: `Study ${topic}`, minutes: 50, kind: 'study' as const, done: false },
        { id: uid('plan'), date, subject: form.subject, title: `Practice ${topic} questions`, minutes: 35, kind: 'practice' as const, done: false },
        { id: uid('plan'), date, subject: form.subject, title: `Recap ${topic}`, minutes: 20, kind: 'recap' as const, done: false },
      ]
    }).flat()
    setPlanTasks(tasks)
  }

  return (
    <motion.div {...fade} className="space-y-5 pb-20 md:pb-0">
      <div><h2 className="font-display text-xl font-bold">AI Study Planner</h2><p className="text-sm text-[var(--text-2)]">Generate a balanced timeline until exam day.</p></div>
      <Card className="grid gap-3 p-4 md:grid-cols-4">
        <input type="date" value={form.examDate} onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
        <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" />
        <input value={form.topics} onChange={e => setForm(f => ({ ...f, topics: e.target.value }))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm md:col-span-1" />
        <Button variant="gradient" onClick={generate}><Sparkles size={15} /> Generate Plan</Button>
      </Card>
      <div className="relative space-y-5 pl-6 before:absolute before:left-2 before:top-0 before:h-full before:w-1 before:rounded-full before:bg-gradient-to-b before:from-primary-500 before:to-emerald-500">
        {grouped.map(([date, tasks]) => <div key={date} className="relative"><span className="absolute -left-[22px] top-4 h-4 w-4 rounded-full border-2 border-white bg-primary-500" /><Card className="p-4"><div className="flex items-center justify-between"><h3 className="font-display font-semibold">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3><Badge color="emerald">{tasks.reduce((sum, t) => sum + t.minutes, 0)} min</Badge></div><div className="mt-3 space-y-2">{tasks.map(task => <label key={task.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-[var(--surface-2)] p-3 text-sm"><input type="checkbox" checked={task.done} onChange={() => togglePlanTask(task.id)} /><span className={task.done ? 'line-through text-[var(--text-3)]' : ''}>{task.title}</span><Badge className="ml-auto" color={task.kind === 'study' ? 'primary' : task.kind === 'practice' ? 'cyan' : 'emerald'}>{task.kind}</Badge></label>)}</div></Card></div>)}
        {grouped.length === 0 && <EmptyState icon={CalendarDays} title="No plan yet" body="Enter your exam date and topics to generate a timeline." />}
      </div>
    </motion.div>
  )
}

export function PomodoroPage() {
  const { pomodoroSessions, addPomodoroSession } = useStudyStore()
  const modes = { focus: 25, short: 5, long: 15 }
  const [mode, setMode] = useState<keyof typeof modes>('focus')
  const [subject, setSubject] = useState('Physics')
  const [remaining, setRemaining] = useState(modes.focus * 60)
  const [running, setRunning] = useState(false)
  const total = modes[mode] * 60
  useEffect(() => { setRemaining(total); setRunning(false) }, [mode])
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setRemaining(s => {
      if (s <= 1) {
        if (mode === 'focus') addPomodoroSession({ subject, minutes: modes.focus })
        setRunning(false)
        return total
      }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [running, mode, subject, total])
  const pct = 100 - (remaining / total) * 100
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10)
    return { day: new Date(d).toLocaleDateString('en-US', { weekday: 'short' }), minutes: pomodoroSessions.filter(s => s.completedAt.slice(0, 10) === d).reduce((sum, s) => sum + s.minutes, 0) }
  })
  return (
    <motion.div {...fade} className="grid gap-5 pb-20 md:pb-0 lg:grid-cols-[1fr_420px]">
      <Card className="flex flex-col items-center p-6 text-center">
        <div className="flex gap-2">{Object.entries(modes).map(([key, min]) => <Chip key={key} active={mode === key} onClick={() => setMode(key as keyof typeof modes)}>{key === 'focus' ? 'Focus' : key === 'short' ? 'Short Break' : 'Long Break'} {min}m</Chip>)}</div>
        <div className="my-8 grid place-items-center">
          <svg width="260" height="260" className="-rotate-90"><defs><linearGradient id="timerGrad" x1="0" x2="1"><stop stopColor="oklch(55% 0.26 290)" /><stop offset="1" stopColor="oklch(70% 0.20 162)" /></linearGradient></defs><circle cx="130" cy="130" r="112" fill="none" stroke="var(--border)" strokeWidth="14" /><circle cx="130" cy="130" r="112" fill="none" stroke="url(#timerGrad)" strokeWidth="14" strokeLinecap="round" strokeDasharray={703} strokeDashoffset={703 - (pct / 100) * 703} /></svg>
          <div className="absolute font-mono text-5xl font-semibold tabular-nums">{Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}</div>
        </div>
        <select value={subject} onChange={e => setSubject(e.target.value)} className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">{subjects.slice(1).map(s => <option key={s.name}>{s.name}</option>)}</select>
        <div className="flex gap-2"><Button variant="gradient" onClick={() => setRunning(r => !r)}>{running ? <Pause size={16} /> : <Play size={16} />}{running ? 'Pause' : 'Start'}</Button><Button variant="secondary" onClick={() => { setRunning(false); setRemaining(total) }}><TimerReset size={16} /> Reset</Button></div>
        <p className="mt-4 text-sm text-[var(--text-2)]">{pomodoroSessions.length} completed focus sessions</p>
      </Card>
      <Card className="p-4"><h3 className="mb-3 font-display font-semibold">Weekly Focus</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Bar dataKey="minutes" fill="oklch(55% 0.26 290)" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
    </motion.div>
  )
}

export function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useStudyStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', target: '10', unit: 'hours', deadline: today() })
  return (
    <motion.div {...fade} className="space-y-5 pb-20 md:pb-0">
      <div className="flex items-center"><div><h2 className="font-display text-xl font-bold">Goals</h2><p className="text-sm text-[var(--text-2)]">Weekly and monthly targets with progress tracking.</p></div><Button className="ml-auto" variant="gradient" onClick={() => setOpen(true)}><Plus size={15} /> Add Goal</Button></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {goals.map(goal => {
          const pct = Math.min(100, Math.round((goal.current / goal.target) * 100))
          return <Card key={goal.id} className="p-4"><div className="flex items-start gap-2"><Target size={18} className="text-primary-500" /><h3 className="flex-1 font-display font-semibold">{goal.title}</h3><button onClick={() => deleteGoal(goal.id)} className="text-[var(--text-3)] hover:text-rose-500"><Trash2 size={15} /></button></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"><motion.div animate={{ width: `${pct}%` }} className="h-full bg-gradient-primary" /></div><div className="mt-3 flex items-center justify-between text-sm"><span>{goal.current.toFixed(goal.unit === 'hours' ? 1 : 0)} / {goal.target} {goal.unit}</span><Badge color={daysUntil(goal.deadline) <= 3 ? 'rose' : 'emerald'}>{daysUntil(goal.deadline)}d left</Badge></div><div className="mt-4 flex gap-2"><Button variant="secondary" size="sm" onClick={() => updateGoal(goal.id, -1)}>-</Button><Button variant="secondary" size="sm" onClick={() => updateGoal(goal.id, 1)}>+</Button></div></Card>
        })}
      </div>
      <AnimatePresence>{open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="font-display font-semibold">Add Goal</h3><button onClick={() => setOpen(false)}><X size={16} /></button></div><div className="mt-4 space-y-3"><input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" /><input type="number" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" /><input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" /><input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm" /></div><Button className="mt-4 w-full" variant="gradient" disabled={!form.title.trim()} onClick={() => { addGoal({ title: form.title, target: Number(form.target) || 1, unit: form.unit, deadline: new Date(form.deadline).toISOString() }); setOpen(false); setForm({ title: '', target: '10', unit: 'hours', deadline: today() }) }}>Create Goal</Button></motion.div></div>}</AnimatePresence>
    </motion.div>
  )
}

function EmptyState({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return <div className="col-span-full rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center"><Icon size={30} className="mx-auto text-[var(--text-3)]" /><h3 className="mt-3 font-display font-semibold">{title}</h3><p className="mt-1 text-sm text-[var(--text-2)]">{body}</p></div>
}
