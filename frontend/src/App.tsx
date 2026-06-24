import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { useThemeStore } from '@/store/themeStore'
import { Skeleton } from '@/components/ui/Skeleton'

// Lazy-loaded pages
const LandingPage = lazy(() => import('@/pages/landing/Landing'))
const LoginPage = lazy(() => import('@/pages/auth/Login'))
const RegisterPage = lazy(() => import('@/pages/auth/Register'))

const StudentDashboard = lazy(() => import('@/pages/student/Dashboard'))
const StudentChat = lazy(() => import('@/pages/student/Chat'))
const StudentQuizzes = lazy(() => import('@/pages/student/Quizzes'))
const StudentFlashcards = lazy(() => import('@/pages/student/Flashcards'))
const StudentAnalytics = lazy(() => import('@/pages/student/Analytics'))
const StudentProfile = lazy(() => import('@/pages/student/Profile'))
const StudentSemesters = lazy(() => import('@/pages/student/Semesters'))
const StudentSubjects = lazy(() => import('@/pages/student/Subjects'))
const StudentMaterials = lazy(() => import('@/pages/student/Materials'))
const StudentPlanner = lazy(() => import('@/pages/student/Planner'))

const TeacherDashboard = lazy(() => import('@/pages/teacher/Dashboard'))
const TeacherMaterials = lazy(() => import('@/pages/teacher/Materials'))
const TeacherAssignments = lazy(() => import('@/pages/teacher/Assignments'))
const TeacherQuizzes = lazy(() => import('@/pages/teacher/Quizzes'))
const TeacherAnalytics = lazy(() => import('@/pages/teacher/Analytics'))
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated && user) {
    const map: Record<string, string> = { student: '/student', teacher: '/teacher', admin: '/admin' }
    return <Navigate to={map[user.role] || '/student'} replace />
  }
  return <>{children}</>
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-3 w-64">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

export default function App() {
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    setTheme(theme)
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<AuthRedirect><LandingPage /></AuthRedirect>} />
            <Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />
            <Route path="/register" element={<AuthRedirect><RegisterPage /></AuthRedirect>} />

            {/* Student routes */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/chat" element={<StudentChat />} />
              <Route path="/student/quizzes" element={<StudentQuizzes />} />
              <Route path="/student/flashcards" element={<StudentFlashcards />} />
              <Route path="/student/analytics" element={<StudentAnalytics />} />
              <Route path="/student/profile" element={<StudentProfile />} />
              <Route path="/student/semesters" element={<StudentSemesters />} />
              <Route path="/student/semesters/:id" element={<StudentSemesters />} />
              <Route path="/student/subjects" element={<StudentSubjects />} />
              <Route path="/student/materials" element={<StudentMaterials />} />
              <Route path="/student/planner" element={<StudentPlanner />} />
            </Route>

            {/* Teacher routes */}
            <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/materials" element={<TeacherMaterials />} />
              <Route path="/teacher/assignments" element={<TeacherAssignments />} />
              <Route path="/teacher/quizzes" element={<TeacherQuizzes />} />
              <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
              <Route path="/teacher/profile" element={<StudentProfile />} />
              <Route path="/teacher/semesters" element={<StudentSemesters />} />
              <Route path="/teacher/semesters/:id" element={<StudentSemesters />} />
              <Route path="/teacher/subjects" element={<StudentSubjects />} />
            </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
