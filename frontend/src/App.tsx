import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from './components/shared'
import { AppShell }    from './components/layout/AppShell'
import Landing         from './pages/landing/Landing'
import Login           from './pages/auth/Login'
import Register        from './pages/auth/Register'
import GoogleCallback  from './pages/auth/GoogleCallback'
import DriveCallback   from './pages/auth/DriveCallback'
import ForgotPassword  from './pages/auth/ForgotPassword'
import ResetPassword   from './pages/auth/ResetPassword'
import Dashboard       from './pages/app/Dashboard'
import AITutor         from './pages/app/AITutor'
import Videos          from './pages/app/Videos'
import Courses         from './pages/app/Courses'
import Notes           from './pages/app/Notes'
import Documents       from './pages/app/Documents'
import Flashcards      from './pages/app/Flashcards'
import Quizzes         from './pages/app/Quizzes'
import Planner         from './pages/app/Planner'
import Pomodoro        from './pages/app/Pomodoro'
import Goals           from './pages/app/Goals'
import Calendar        from './pages/app/Calendar'
import Analytics       from './pages/app/Analytics'
import Profile         from './pages/app/Profile'
import Notifications   from './pages/app/Notifications'
import Settings        from './pages/app/Settings'
import AdminDashboard  from './pages/admin/Dashboard'
import { ProtectedRoute } from './components/shared'

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Landing />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/drive-callback"        element={<DriveCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />

        <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="ai"            element={<AITutor />} />
          <Route path="ai/c/:sessionId" element={<AITutor />} />
          <Route path="videos"        element={<Videos />} />
          <Route path="courses"       element={<Courses />} />
          <Route path="notes"         element={<Notes />} />
          <Route path="documents"     element={<Documents />} />
          <Route path="flashcards"    element={<Flashcards />} />
          <Route path="quiz"          element={<Quizzes />} />
          <Route path="quizzes"       element={<Quizzes />} />
          <Route path="planner"       element={<Planner />} />
          <Route path="pomodoro"      element={<Pomodoro />} />
          <Route path="goals"         element={<Goals />} />
          <Route path="calendar"      element={<Calendar />} />
          <Route path="analytics"     element={<Analytics />} />
          <Route path="profile"       element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings"      element={<Settings />} />
        </Route>

        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AppShell /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
        </Route>

        <Route path="/notes"      element={<Navigate to="/app/notes" replace />} />
        <Route path="/documents"  element={<Navigate to="/app/documents" replace />} />
        <Route path="/quiz"       element={<Navigate to="/app/quiz" replace />} />
        <Route path="/flashcards" element={<Navigate to="/app/flashcards" replace />} />
        <Route path="/planner"    element={<Navigate to="/app/planner" replace />} />
        <Route path="/pomodoro"   element={<Navigate to="/app/pomodoro" replace />} />
        <Route path="/goals"      element={<Navigate to="/app/goals" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
