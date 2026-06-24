import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, MessageSquare, Brain, BarChart2,
  Bell, Settings, LogOut, ChevronLeft, ChevronRight, Sun, Moon,
  Calendar, FileText, Award, Layers, User, Menu, X
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/api/auth'
import { useUnreadCount } from '@/api/notifications'
import { useThemeStore } from '@/store/themeStore'
import { Avatar, Badge, Button } from '@/components/ui'
import { cn } from '@/lib/utils'

const studentNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/student' },
  { icon: Layers, label: 'Semesters', href: '/student/semesters' },
  { icon: BookOpen, label: 'Subjects', href: '/student/subjects' },
  { icon: FileText, label: 'Materials', href: '/student/materials' },
  { icon: MessageSquare, label: 'AI Chatbot', href: '/student/chat' },
  { icon: Brain, label: 'Quizzes', href: '/student/quizzes' },
  { icon: Award, label: 'Flashcards', href: '/student/flashcards' },
  { icon: Calendar, label: 'Study Planner', href: '/student/planner' },
  { icon: BarChart2, label: 'Analytics', href: '/student/analytics' },
  { icon: User, label: 'Profile', href: '/student/profile' },
]

const teacherNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/teacher' },
  { icon: Layers, label: 'Semesters', href: '/teacher/semesters' },
  { icon: BookOpen, label: 'Subjects', href: '/teacher/subjects' },
  { icon: FileText, label: 'Materials', href: '/teacher/materials' },
  { icon: Award, label: 'Assignments', href: '/teacher/assignments' },
  { icon: Brain, label: 'Quizzes', href: '/teacher/quizzes' },
  { icon: BarChart2, label: 'Analytics', href: '/teacher/analytics' },
  { icon: User, label: 'Profile', href: '/teacher/profile' },
]

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: User, label: 'Users', href: '/admin/users' },
  { icon: Layers, label: 'Semesters', href: '/admin/semesters' },
  { icon: BookOpen, label: 'Subjects', href: '/admin/subjects' },
  { icon: Brain, label: 'AI Analytics', href: '/admin/ai-analytics' },
  { icon: BarChart2, label: 'Analytics', href: '/admin/analytics' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const { mutate: logout } = useLogout()
  const { data: unread } = useUnreadCount()
  const { theme, setTheme } = useThemeStore()

  const navItems = user?.role === 'admin' ? adminNavItems
    : user?.role === 'teacher' ? teacherNavItems
    : studentNavItems

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-border', collapsed && 'px-3 justify-center')}>
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
          <Brain className="h-4 w-4 text-white" />
        </div>
        {!collapsed && <span className="font-bold text-lg gradient-text">EduAI</span>}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/student' && item.href !== '/teacher' && item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
              <motion.div
                whileHover={{ x: 2 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.label === 'Notifications' && unread?.count ? (
                  <Badge variant="destructive" className="ml-auto text-xs">{unread.count}</Badge>
                ) : null}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-1">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all',
            collapsed && 'justify-center'
          )}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={() => logout()}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-xl bg-muted/50">
            <Avatar name={user.full_name} src={user.avatar} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-card border border-border shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full z-50 w-64 bg-card border-r border-border shadow-xl lg:hidden"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full bg-card border-r border-border z-30 overflow-hidden"
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center shadow-sm hover:bg-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </motion.aside>
    </>
  )
}
