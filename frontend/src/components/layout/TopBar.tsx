import { useLocation } from 'react-router-dom'
import { Search, Sun, Moon, Bell, Menu } from 'lucide-react'
import { useTheme } from '../../store/themeStore'
import { Input } from '../ui'

const titles: Record<string, string> = {
  '/app':               'Dashboard',
  '/app/ai':            'AI Tutor',
  '/app/semesters':     'Semesters',
  '/app/courses':       'Courses',
  '/app/notes':         'Notes',
  '/app/documents':     'Documents',
  '/app/flashcards':    'Flashcards',
  '/app/quiz':          'Quiz',
  '/app/quizzes':       'Quizzes',
  '/app/planner':       'Planner',
  '/app/pomodoro':      'Focus',
  '/app/goals':         'Goals',
  '/app/calendar':      'Calendar',
  '/app/analytics':     'Analytics',
  '/app/profile':       'Profile',
  '/app/notifications': 'Notifications',
  '/app/settings':      'Settings',
}

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { pathname } = useLocation()
  const { dark, toggle } = useTheme()

  return (
    <header className="h-14 flex items-center gap-3 px-4 md:px-6 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors"
      >
        <Menu size={18} />
      </button>

      <h1 className="font-display font-semibold text-[var(--text-1)] text-base">
        {titles[pathname] ?? 'StudyBuddy'}
      </h1>

      <div className="flex-1 max-w-xs ml-2 hidden sm:block">
        <Input icon={<Search size={14} />} placeholder="Search anything…" className="h-8 text-xs" />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button onClick={toggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors">
          <Bell size={16} />
        </button>
      </div>
    </header>
  )
}
