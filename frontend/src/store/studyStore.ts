import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SubjectColor = 'primary' | 'emerald' | 'cyan' | 'amber' | 'rose'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Note {
  id: string
  title: string
  subject: string
  color: SubjectColor
  tags: string[]
  content: string
  pinned: boolean
  favorite: boolean
  updatedAt: string
}

export interface Document {
  id: string
  title: string
  subject: string
  color: SubjectColor
  type: 'pdf' | 'docx' | 'txt' | 'md'
  size: number
  pageCount: number
  wordCount: number
  uploadedAt: string
  summary: string
}

export interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  answerIndex: number
  explanation: string
}

export interface QuizHistory {
  id: string
  subject: string
  topic: string
  difficulty: Difficulty
  score: number
  total: number
  timeTaken: number
  date: string
  answers: number[]
  questions: QuizQuestion[]
}

export interface Flashcard {
  id: string
  deckId: string
  question: string
  answer: string
  ease: number
  dueAt: string
  reviewed: number
}

export interface FlashcardDeck {
  id: string
  title: string
  subject: string
  color: SubjectColor
  cardIds: string[]
  createdAt: string
}

export interface PlanTask {
  id: string
  date: string
  subject: string
  title: string
  minutes: number
  kind: 'study' | 'practice' | 'recap'
  done: boolean
}

export interface PomodoroSession {
  id: string
  subject: string
  minutes: number
  completedAt: string
}

export interface Goal {
  id: string
  title: string
  target: number
  current: number
  unit: string
  deadline: string
  linkedActivity?: 'focus' | 'quiz' | 'flashcards' | 'documents'
}

interface StudyState {
  notes: Note[]
  documents: Document[]
  quizHistory: QuizHistory[]
  decks: FlashcardDeck[]
  flashcards: Flashcard[]
  planTasks: PlanTask[]
  pomodoroSessions: PomodoroSession[]
  goals: Goal[]
  addNote: (note?: Partial<Note>) => string
  updateNote: (id: string, patch: Partial<Note>) => void
  deleteNote: (id: string) => void
  addDocuments: (docs: Document[]) => void
  deleteDocument: (id: string) => void
  addQuizHistory: (item: QuizHistory) => void
  addDeck: (deck: Omit<FlashcardDeck, 'id' | 'cardIds' | 'createdAt'>, cards: Array<Pick<Flashcard, 'question' | 'answer'>>) => void
  reviewCard: (id: string, rating: 'again' | 'hard' | 'good' | 'easy') => void
  setPlanTasks: (tasks: PlanTask[]) => void
  togglePlanTask: (id: string) => void
  addPomodoroSession: (session: Omit<PomodoroSession, 'id' | 'completedAt'>) => void
  addGoal: (goal: Omit<Goal, 'id' | 'current'> & { current?: number }) => void
  updateGoal: (id: string, delta: number) => void
  deleteGoal: (id: string) => void
}

const now = () => new Date().toISOString()
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`

const seedNotes: Note[] = []
const seedDocuments: Document[] = []
const seedDecks: FlashcardDeck[] = []
const seedCards: Flashcard[] = []
const seedGoals: Goal[] = []

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      notes: seedNotes,
      documents: seedDocuments,
      quizHistory: [],
      decks: seedDecks,
      flashcards: seedCards,
      planTasks: [],
      pomodoroSessions: [],
      goals: seedGoals,
      addNote: note => {
        const newId = id('note')
        set(state => ({
          notes: [{
            id: newId,
            title: note?.title || 'Untitled note',
            subject: note?.subject || 'General',
            color: note?.color || 'primary',
            tags: note?.tags || [],
            content: note?.content || '# New note\nStart writing...',
            pinned: false,
            favorite: false,
            updatedAt: now(),
          }, ...state.notes],
        }))
        return newId
      },
      updateNote: (noteId, patch) => set(state => ({
        notes: state.notes.map(note => note.id === noteId ? { ...note, ...patch, updatedAt: now() } : note),
      })),
      deleteNote: noteId => set(state => ({ notes: state.notes.filter(note => note.id !== noteId) })),
      addDocuments: docs => set(state => ({ documents: [...docs, ...state.documents] })),
      deleteDocument: docId => set(state => ({ documents: state.documents.filter(doc => doc.id !== docId) })),
      addQuizHistory: item => set(state => ({
        quizHistory: [item, ...state.quizHistory],
        goals: state.goals.map(goal => goal.linkedActivity === 'quiz' ? { ...goal, current: Math.min(goal.target, goal.current + 1) } : goal),
      })),
      addDeck: (deck, cards) => {
        const deckId = id('deck')
        const newCards = cards.map(card => ({ id: id('card'), deckId, question: card.question, answer: card.answer, ease: 2.5, dueAt: now(), reviewed: 0 }))
        set(state => ({
          decks: [{ ...deck, id: deckId, cardIds: newCards.map(card => card.id), createdAt: now() }, ...state.decks],
          flashcards: [...newCards, ...state.flashcards],
        }))
      },
      reviewCard: (cardId, rating) => {
        const days = { again: 0.01, hard: 1, good: 3, easy: 7 }[rating]
        const easeDelta = { again: -0.25, hard: -0.1, good: 0.05, easy: 0.15 }[rating]
        set(state => ({
          flashcards: state.flashcards.map(card => card.id === cardId
            ? { ...card, reviewed: card.reviewed + 1, ease: Math.max(1.3, card.ease + easeDelta), dueAt: new Date(Date.now() + days * 86400000).toISOString() }
            : card),
          goals: state.goals.map(goal => goal.linkedActivity === 'flashcards' ? { ...goal, current: Math.min(goal.target, goal.current + 1) } : goal),
        }))
      },
      setPlanTasks: tasks => set({ planTasks: tasks }),
      togglePlanTask: taskId => set(state => ({ planTasks: state.planTasks.map(task => task.id === taskId ? { ...task, done: !task.done } : task) })),
      addPomodoroSession: session => set(state => ({
        pomodoroSessions: [{ ...session, id: id('focus'), completedAt: now() }, ...state.pomodoroSessions],
        goals: state.goals.map(goal => goal.linkedActivity === 'focus' ? { ...goal, current: Math.min(goal.target, goal.current + session.minutes / 60) } : goal),
      })),
      addGoal: goal => set(state => ({ goals: [{ ...goal, id: id('goal'), current: goal.current || 0 }, ...state.goals] })),
      updateGoal: (goalId, delta) => set(state => ({ goals: state.goals.map(goal => goal.id === goalId ? { ...goal, current: Math.max(0, Math.min(goal.target, goal.current + delta)) } : goal) })),
      deleteGoal: goalId => set(state => ({ goals: state.goals.filter(goal => goal.id !== goalId) })),
    }),
    {
      name: 'studybuddy-study-store',
      version: 2,
      migrate: persisted => ({
        ...(persisted as StudyState),
        notes: [],
        documents: [],
        quizHistory: [],
        decks: [],
        flashcards: [],
        planTasks: [],
        goals: [],
      }),
    },
  ),
)

export function getSubjects() {
  const state = useStudyStore.getState()
  const pairs = [...state.notes.map(n => [n.subject, n.color] as const), ...state.documents.map(d => [d.subject, d.color] as const), ...state.decks.map(d => [d.subject, d.color] as const)]
  return Array.from(new Map(pairs)).map(([name, color]) => ({ name, color }))
}
