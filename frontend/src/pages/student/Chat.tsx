import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, MessageSquare, Trash2, Clock } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button, Card } from '@/components/ui'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { useChatSessions, useDeleteChatSession } from '@/api/ai'
import { formatRelativeTime, truncate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeSession, setActiveSession] = useState<string | undefined>(searchParams.get('session') || undefined)
  const { data: sessions } = useChatSessions()
  const { mutate: deleteSession } = useDeleteChatSession()

  const handleNewChat = () => {
    setActiveSession(undefined)
    setSearchParams({})
  }

  const selectSession = (id: string) => {
    setActiveSession(id)
    setSearchParams({ session: id })
  }

  return (
    <DashboardLayout title="AI Study Chat">
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-3">
          <Button onClick={handleNewChat} className="w-full">
            <Plus className="h-4 w-4" /> New Chat
          </Button>

          <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
            {sessions?.results?.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'group flex items-start gap-2 p-3 rounded-xl cursor-pointer transition-all',
                  activeSession === session.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/60'
                )}
                onClick={() => selectSession(session.id)}
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.title || 'New Chat'}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" /> {formatRelativeTime(session.updated_at)}
                  </p>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-destructive transition-all shrink-0"
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
            {!sessions?.results?.length && (
              <p className="text-xs text-muted-foreground text-center py-8">No chat history yet</p>
            )}
          </div>
        </div>

        {/* Chat */}
        <Card className="flex-1 p-0 overflow-hidden flex flex-col">
          <ChatInterface
            sessionId={activeSession}
            onSessionCreated={(id) => { setActiveSession(id); setSearchParams({ session: id }) }}
          />
        </Card>
      </div>
    </DashboardLayout>
  )
}
