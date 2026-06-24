export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: 'student' | 'teacher' | 'admin'
  avatar?: string
  is_verified: boolean
  oauth_provider?: string
  created_at: string
  student_profile?: StudentProfile
  teacher_profile?: TeacherProfile
}

export interface StudentProfile {
  usn?: string
  department: string
  current_semester: number
  skills: string[]
  learning_interests: string[]
  resume_url?: string
  bio: string
}

export interface TeacherProfile {
  department: string
  qualification: string
  experience_years: number
  subjects_handled: string[]
  bio: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface Semester {
  id: string
  name: string
  number: number
  department: string
  academic_year: string
  description: string
  is_active: boolean
  subjects_count: number
  created_at: string
}

export interface Subject {
  id: string
  semester: string
  name: string
  code: string
  description: string
  credits: number
  teacher?: string
  teacher_name?: string
  materials_count: number
  is_active: boolean
}

export interface StudyMaterial {
  id: string
  subject: string
  subject_name: string
  title: string
  description: string
  material_type: 'notes' | 'assignment' | 'pyq' | 'reference' | 'syllabus' | 'other'
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_by_name: string
  is_processed: boolean
  download_count: number
  created_at: string
}

export interface ChatSession {
  id: string
  subject?: string
  title: string
  is_active: boolean
  created_at: string
  updated_at: string
  message_count: number
  last_message?: ChatMessage
  messages?: ChatMessage[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources: Array<{ content: string; metadata: Record<string, string> }>
  tokens_used: number
  created_at: string
}

export interface Quiz {
  id: string
  subject: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  questions: QuizQuestion[]
  time_limit_minutes: number
  is_ai_generated: boolean
  is_published: boolean
  attempts_count: number
  created_at: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

export interface StudyPlan {
  id: string
  student: string
  subject?: string
  title: string
  plan_data: Record<string, unknown>
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export interface Flashcard {
  id: string
  subject: string
  title: string
  cards: Array<{ front: string; back: string }>
  is_ai_generated: boolean
  created_at: string
}

export interface Assignment {
  id: string
  subject: string
  subject_name: string
  title: string
  description: string
  due_date: string
  max_marks: number
  attachment_url?: string
  status: 'draft' | 'published' | 'closed'
  submissions_count: number
  created_at: string
}

export interface Notification {
  id: string
  title: string
  message: string
  notification_type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  link?: string
  created_at: string
}

export interface AnalyticsData {
  quiz_stats: { total: number; avg_score: number }
  submissions_count: number
  graded_submissions: number
  chat_sessions_count: number
  recent_quiz_scores: Array<{ quiz__title: string; score: number; completed_at: string }>
  avg_assignment_score: number
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type Theme = 'light' | 'dark' | 'system'
