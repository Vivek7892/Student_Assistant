import { Link } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUnreadCount } from '@/api/notifications'
import { Avatar, Badge } from '@/components/ui'

interface TopBarProps {
  title?: string
  sidebarCollapsed?: boolean
}

export function TopBar({ title }: TopBarProps) {
  const user = useAuthStore((s) => s.user)
  const { data: unread } = useUnreadCount()

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="pl-10 lg:pl-0">
          {title && <h1 className="text-lg font-semibold">{title}</h1>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-muted/60 border border-border rounded-xl px-3 py-1.5 text-sm text-muted-foreground w-56 cursor-pointer hover:bg-muted transition-colors">
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs bg-background border border-border rounded px-1.5">⌘K</kbd>
        </div>

        {/* Notifications */}
        <Link to={`/${user?.role}/notifications`} className="relative p-2 rounded-xl hover:bg-accent transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {!!unread?.count && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center font-medium">
              {unread.count > 9 ? '9+' : unread.count}
            </span>
          )}
        </Link>

        {/* Profile */}
        {user && (
          <Link to={`/${user.role}/profile`}>
            <Avatar name={user.full_name} src={user.avatar} size="sm" className="cursor-pointer hover:ring-2 hover:ring-primary transition-all" />
          </Link>
        )}
      </div>
    </header>
  )
}
