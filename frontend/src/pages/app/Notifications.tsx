import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Bot, Flame, Trophy, BookOpen, Clock, Check,
  Trash2, CheckCheck, Filter, RefreshCw, X,
} from 'lucide-react'
import { Card, Badge, Button, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

const typeIcon: Record<string, React.ElementType> = {
  deadline: Clock, ai: Bot, streak: Flame, grade: Trophy,
  reminder: BookOpen, system: Bell, default: Bell,
}
const typeColor: Record<string, string> = {
  deadline: 'rose', ai: 'primary', streak: 'amber',
  grade: 'emerald', reminder: 'cyan', system: 'primary', default: 'primary',
}
const typeLabel: Record<string, string> = {
  deadline: 'Deadline', ai: 'AI', streak: 'Streak',
  grade: 'Grade', reminder: 'Reminder', system: 'System',
}

type FilterType = 'all' | 'unread' | 'deadline' | 'ai' | 'streak' | 'grade' | 'reminder'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function Notifications() {
  const [notifs,    setNotifs]    = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)
  const [filter,    setFilter]    = useState<FilterType>('all')

  const fetchNotifs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const r = await api.get('/api/notifications/')
      setNotifs(Array.isArray(r.data) ? r.data : r.data?.results ?? [])
    } catch {
      setNotifs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifs()
    // Poll every 30s for new notifications
    const id = setInterval(() => fetchNotifs(true), 30000)
    return () => clearInterval(id)
  }, [fetchNotifs])

  function markRead(id: string) {
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
    api.patch(`/api/notifications/${id}/`, { is_read: true }).catch(() => {})
  }

  function markAllRead() {
    setNotifs(n => n.map(x => ({ ...x, is_read: true })))
    api.post('/api/notifications/mark-all-read/').catch(() => {})
  }

  function deleteNotif(id: string) {
    setNotifs(n => n.filter(x => x.id !== id))
    api.delete(`/api/notifications/${id}/`).catch(() => {})
  }

  function clearAll() {
    const readIds = notifs.filter(n => n.is_read).map(n => n.id)
    setNotifs(n => n.filter(x => !x.is_read))
    readIds.forEach(id => api.delete(`/api/notifications/${id}/`).catch(() => {}))
  }

  const unread = notifs.filter(n => !n.is_read).length

  const filtered = notifs.filter(n => {
    const ntype = n.notification_type ?? n.type ?? 'default'
    if (filter === 'all')    return true
    if (filter === 'unread') return !n.is_read
    return ntype === filter
  })

  // Group by today / yesterday / older
  const today     = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  function getGroup(n: any) {
    const d = new Date(n.created_at).toDateString()
    if (d === today)     return 'Today'
    if (d === yesterday) return 'Yesterday'
    return 'Earlier'
  }

  const groups: Record<string, any[]> = {}
  filtered.forEach(n => {
    const g = getGroup(n)
    if (!groups[g]) groups[g] = []
    groups[g].push(n)
  })
  const groupOrder = ['Today', 'Yesterday', 'Earlier']

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'unread',   label: 'Unread' },
    { key: 'deadline', label: 'Deadlines' },
    { key: 'ai',       label: 'AI' },
    { key: 'streak',   label: 'Streaks' },
    { key: 'grade',    label: 'Grades' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-xl font-bold text-[var(--text-1)]">Notifications</h2>
          {unread > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fetchNotifs(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-3)] hover:bg-[var(--surface-2)] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="gap-1.5 text-xs">
              <CheckCheck size={13} /> Mark all read
            </Button>
          )}
          {notifs.some(n => n.is_read) && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5 text-xs text-[var(--text-3)]">
              <Trash2 size={13} /> Clear read
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
        {filterTabs.map(t => {
          const count = t.key === 'all'
            ? notifs.length
            : t.key === 'unread'
              ? unread
              : notifs.filter(n => (n.notification_type ?? n.type) === t.key).length
          return (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                filter === t.key
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300'
                  : 'text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-2)]'
              )}>
              {t.label}
              {count > 0 && (
                <span className={cn(
                  'inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold',
                  filter === t.key ? 'bg-primary-500 text-white' : 'bg-[var(--surface-2)] text-[var(--text-3)]'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell size={28} className="mx-auto text-[var(--text-3)] mb-3" />
          <p className="text-sm text-[var(--text-2)]">
            {filter === 'unread' ? 'All caught up!' : 'No notifications'}
          </p>
          <p className="text-xs text-[var(--text-3)] mt-1">
            {filter === 'all' ? "You'll see updates about deadlines, streaks, and AI activity here" : ''}
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {groupOrder.map(group => {
            const items = groups[group]
            if (!items?.length) return null
            return (
              <div key={group}>
                <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2 px-1">{group}</p>
                <div className="space-y-1.5">
                  <AnimatePresence initial={false}>
                    {items.map(n => {
                      const ntype = n.notification_type ?? n.type ?? 'default'
                      const Icon  = typeIcon[ntype] ?? Bell
                      const color = typeColor[ntype] ?? 'primary'
                      const read  = n.is_read ?? n.read ?? false
                      return (
                        <motion.div
                          key={n.id} layout
                          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, height: 0 }}
                          className={cn(
                            'group flex items-start gap-3 p-3.5 rounded-2xl border transition-colors cursor-pointer',
                            read
                              ? 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                              : 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                          )}
                          onClick={() => !read && markRead(n.id)}
                        >
                          {/* Icon */}
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                            color === 'rose'    ? 'bg-rose-400/10'    :
                            color === 'amber'   ? 'bg-amber-400/10'   :
                            color === 'emerald' ? 'bg-emerald-400/10' :
                            color === 'cyan'    ? 'bg-cyan-400/10'    : 'bg-primary-100 dark:bg-primary-900/30'
                          )}>
                            <Icon size={15} className={cn(
                              color === 'rose'    ? 'text-rose-500'    :
                              color === 'amber'   ? 'text-amber-500'   :
                              color === 'emerald' ? 'text-emerald-500' :
                              color === 'cyan'    ? 'text-cyan-500'    : 'text-primary-500'
                            )} />
                          </div>

                          {/* Body */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={cn('text-sm', read ? 'font-medium text-[var(--text-1)]' : 'font-semibold text-[var(--text-1)]')}>
                                  {n.title}
                                </p>
                                <Badge color={color} className="text-[10px] py-0">{typeLabel[ntype] ?? ntype}</Badge>
                              </div>
                              <span className="text-[10px] text-[var(--text-3)] shrink-0 mt-0.5">
                                {timeAgo(n.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-2)] mt-0.5 leading-relaxed">{n.message ?? n.body}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!read && (
                              <button
                                onClick={e => { e.stopPropagation(); markRead(n.id) }}
                                className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-emerald-400/20 text-[var(--text-3)] hover:text-emerald-500 transition-colors"
                                title="Mark read"
                              >
                                <Check size={12} />
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}
                              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-rose-400/20 text-[var(--text-3)] hover:text-rose-500 transition-colors"
                              title="Delete"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          {/* Unread dot */}
                          {!read && <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-2" />}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
