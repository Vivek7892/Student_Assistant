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
import Courses         from './pages/app/Courses'
import Documents       from './pages/app/Documents'
import Flashcards      from './pages/app/Flashcards'
import Quizzes         from './pages/app/Quizzes'
import Planner         from './pages/app/Planner'
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
          <Route path="courses"       element={<Courses />} />
          <Route path="documents"     element={<Documents />} />
          <Route path="flashcards"    element={<Flashcards />} />
          <Route path="quizzes"       element={<Quizzes />} />
          <Route path="planner"       element={<Planner />} />
          <Route path="calendar"      element={<Calendar />} />
          <Route path="analytics"     element={<Analytics />} />
          <Route path="profile"       element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings"      element={<Settings />} />
        </Route>

        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AppShell /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
