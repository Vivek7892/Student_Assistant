import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Bot, Youtube, FileText, HardDrive,
  CreditCard, Brain, CalendarDays, Calendar, BarChart3,
  User, Settings, Bell, ChevronLeft, Shield, X,
  BookOpen, ExternalLink,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Logo } from '../ui/Logo'
import { useAuth } from '../../store/authStore'
import { api } from '../../lib/api'

// ── Nav groups ───────────────────────────────────────────────────────────────
const navGroups = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, to: '/app' },
      { label: 'AI Tutor',  icon: Bot,             to: '/app/ai' },
    ],
  },
  {
    label: 'Study',
    items: [
      { label: 'Videos',     icon: Youtube,      to: '/app/courses' },
      { label: 'Documents',  icon: FileText,     to: '/app/documents', hasDrive: true },
      { label: 'Flashcards', icon: CreditCard,   to: '/app/flashcards' },
      { label: 'Quizzes',    icon: Brain,        to: '/app/quizzes' },
    ],
  },
  {
    label: 'Plan',
    items: [
      { label: 'Planner',   icon: CalendarDays, to: '/app/planner' },
      { label: 'Calendar',  icon: Calendar,     to: '/app/calendar' },
      { label: 'Analytics', icon: BarChart3,    to: '/app/analytics' },
    ],
  },
]

const bottomNav = [
  { label: 'Profile',       icon: User,     to: '/app/profile' },
  { label: 'Notifications', icon: Bell,     to: '/app/notifications', badge: true },
  { label: 'Settings',      icon: Settings, to: '/app/settings' },
]

// Google Drive folder URL — opens user's Drive in a new tab
const DRIVE_URL = 'https://drive.google.com/drive/my-drive'

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const [collapsed,   setCollapsed]   = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()
  const { user: authUser } = useAuth()
  const role     = authUser?.role ?? 'student'
  const isMobile = !!onClose
  const isCollapsed = !isMobile && collapsed

  // Poll unread notification count
  useEffect(() => {
    function fetchUnread() {
      api.get('/api/notifications/')
        .then(r => {
          const list: any[] = Array.isArray(r.data) ? r.data : r.data?.results ?? []
          setUnreadCount(list.filter(n => !n.is_read).length)
        })
        .catch(() => {})
    }
    fetchUnread()
    const id = setInterval(fetchUnread, 30000)
    return () => clearInterval(id)
  }, [])

  const adminItem = role === 'admin'
    ? [{ label: 'Admin Panel', icon: Shield, to: '/admin' }]
    : []

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 64 : 224 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full bg-[var(--surface)] border-r border-[var(--border)] overflow-hidden shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[var(--border)]">
        <div className="shrink-0"><Logo size={32} /></div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              className="font-display font-bold text-lg text-[var(--text-1)] tracking-tight flex-1"
            >
              StudyBuddy
            </motion.span>
          )}
        </AnimatePresence>
        {isMobile && (
          <button onClick={onClose} className="ml-auto p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-2)]">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar py-3 px-2 space-y-4">

        {/* Admin shortcut */}
        {adminItem.map(({ label, icon: Icon, to }) => {
          const active = location.pathname.startsWith(to)
          return (
            <NavLink key={to} to={to} title={isCollapsed ? label : undefined} onClick={onClose}
              className={cn('nav-item', active && 'active')}>
              <Icon size={18} className="shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="truncate">
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          )
        })}

        {/* Grouped nav */}
        {navGroups.map(group => (
          <div key={group.label} className="space-y-0.5">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider px-3 pb-1"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            {group.items.map(({ label, icon: Icon, to, hasDrive }: any) => {
              const active = to === '/app'
                ? location.pathname === '/app'
                : location.pathname.startsWith(to)
              return (
                <div key={to} className="relative group/item">
                  <NavLink to={to} title={isCollapsed ? label : undefined} onClick={onClose}
                    className={cn('nav-item', active && 'active')}>
                    <Icon size={18} className="shrink-0" />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="truncate flex-1">
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {/* Drive icon for Documents */}
                    {hasDrive && !isCollapsed && (
                      <a
                        href={DRIVE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="Open Google Drive"
                        className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)] hover:text-primary-500"
                      >
                        <HardDrive size={13} />
                      </a>
                    )}
                  </NavLink>
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[var(--border)] px-2 py-2 space-y-0.5">
        {bottomNav.map(({ label, icon: Icon, to, badge }) => {
          const active = location.pathname.startsWith(to)
          return (
            <NavLink key={to} to={to} title={isCollapsed ? label : undefined} onClick={onClose}
              className={cn('nav-item relative', active && 'active')}>
              <div className="relative shrink-0">
                <Icon size={18} />
                {badge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-primary-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="truncate flex-1">
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {badge && unreadCount > 0 && !isCollapsed && (
                <AnimatePresence>
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="ml-auto min-w-[18px] h-4.5 px-1 rounded-full bg-primary-500 text-white text-[9px] font-bold flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                </AnimatePresence>
              )}
            </NavLink>
          )
        })}

        {/* Google Drive shortcut */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.a
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              href={DRIVE_URL} target="_blank" rel="noopener noreferrer"
              className="nav-item text-[var(--text-3)] hover:text-[var(--text-1)]"
              title="Google Drive"
            >
              <HardDrive size={18} className="shrink-0" />
              <span className="truncate flex-1">Google Drive</span>
              <ExternalLink size={11} className="shrink-0 opacity-60" />
            </motion.a>
          )}
        </AnimatePresence>

        {/* User chip */}
        <div className={cn('flex items-center gap-2.5 px-2 py-2 mt-1 rounded-xl', isCollapsed && 'justify-center')}>
          <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center shrink-0 text-white text-xs font-bold">
            {authUser?.first_name?.[0] ?? authUser?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-1)] truncate">{authUser?.full_name ?? authUser?.email}</p>
                <p className="text-xs text-[var(--text-3)] capitalize">{authUser?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute top-4 -right-3 w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shadow-glass hover:bg-[var(--surface-2)] transition-colors z-10"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronLeft size={12} className="text-[var(--text-2)]" />
          </motion.div>
        </button>
      )}
    </motion.aside>
  )
}
