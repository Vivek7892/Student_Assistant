// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: 'student' | 'teacher' | 'instructor' | 'admin'
  avatar?: string
  is_verified: boolean
  bio?: string
  university?: string
  major?: string
  gpa?: number
  streak?: number
  xp?: number
  level?: number
}

// ── Courses ───────────────────────────────────────────────────────────────────
export interface Semester {
  id: number
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  progress: number
  subjects: Subject[]
}

export interface Subject {
  id: number
  name: string
  code: string
  instructor: string
  credits: number
  color: string
  progress: number
  grade?: string
  materials_count: number
  next_class?: string
  semester: number
}

export interface Material {
  id: number
  name: string
  file: string
  file_type: 'pdf' | 'doc' | 'audio' | 'video' | 'other'
  file_size: string
  subject: number
  subject_name: string
  uploaded_at: string
  page_count?: number
  summary?: string
  is_processed: boolean
}

// ── AI ────────────────────────────────────────────────────────────────────────
export interface ChatSession {
  id: number
  title: string
  created_at: string
  updated_at: string
  messages: ChatMessage[]
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources: string[]
  created_at: string
}

export interface Quiz {
  id: number
  title: string
  subject: number
  subject_name: string
  difficulty: 'easy' | 'medium' | 'hard'
  questions: QuizQuestion[]
  score?: number
  completed_at?: string
  time_spent?: string
}

export interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correct: number
  explanation: string
}

export interface FlashcardDeck {
  id: number
  title: string
  subject: number
  subject_name: string
  color: string
  cards: Flashcard[]
  total_cards: number
  mastered_cards: number
  due_today: number
}

export interface Flashcard {
  id: number
  front: string
  back: string
  mastered: boolean
  next_review?: string
}

export interface StudyPlan {
  id: number
  title: string
  content: string
  created_at: string
}

// ── Assignments ───────────────────────────────────────────────────────────────
export interface Assignment {
  id: number
  title: string
  description: string
  subject: number
  subject_name: string
  due_date: string
  priority: 'low' | 'medium' | 'high'
  type: 'assignment' | 'project' | 'lab' | 'quiz' | 'meeting'
  submission?: Submission
}

export interface Submission {
  id: number
  file?: string
  text?: string
  submitted_at: string
  grade?: number
  feedback?: string
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export interface StudentAnalytics {
  total_study_hours: number
  avg_quiz_score: number
  streak: number
  xp: number
  weekly_activity: WeeklyActivity[]
  subject_mastery: SubjectMastery[]
  monthly_progress: MonthlyProgress[]
}

export interface WeeklyActivity {
  day: string
  hours: number
  quizzes: number
  flashcards: number
}

export interface SubjectMastery {
  subject: string
  score: number
  fullMark: number
}

export interface MonthlyProgress {
  month: string
  score: number
  target: number
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface Notification {
  id: number
  type: 'deadline' | 'ai' | 'streak' | 'grade' | 'reminder'
  title: string
  body: string
  read: boolean
  created_at: string
}

// ── Files ─────────────────────────────────────────────────────────────────────
export interface UploadedFile {
  id: number
  name: string
  url: string
  size: number
  content_type: string
  uploaded_at: string
}

// ── API Responses ─────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiError {
  detail?: string
  [key: string]: unknown
}
