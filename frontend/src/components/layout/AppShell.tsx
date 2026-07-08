import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Brain, CreditCard, FileText, Target, Timer } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { cn } from '../../lib/utils'

const mobileNav = [
  { label: 'Notes', icon: BookOpen, to: '/app/notes' },
  { label: 'Docs', icon: FileText, to: '/app/documents' },
  { label: 'Quiz', icon: Brain, to: '/app/quiz' },
  { label: 'Cards', icon: CreditCard, to: '/app/flashcards' },
  { label: 'Focus', icon: Timer, to: '/app/pomodoro' },
  { label: 'Goals', icon: Target, to: '/app/goals' },
]

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden mesh-bg">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              <Sidebar onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <motion.main
          key="main"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto p-4 pb-24 md:p-6"
        >
          <Outlet />
        </motion.main>
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 pb-safe pt-1 backdrop-blur">
          <div className="grid grid-cols-6 gap-1">
            {mobileNav.map(({ label, icon: Icon, to }) => (
              <NavLink key={to} to={to} className={({ isActive }) => cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium text-[var(--text-3)]',
                isActive && 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300',
              )}>
                <Icon size={17} />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
