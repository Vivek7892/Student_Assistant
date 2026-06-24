import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MessageSquare, Brain, Award, BarChart2, BookOpen, Layers, ArrowRight, TrendingUp, Zap } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Badge, Button, Avatar } from '@/components/ui'
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/store/authStore'
import { useStudentAnalytics } from '@/api/analytics'
import { useSemesters } from '@/api/courses'
import { useChatSessions } from '@/api/ai'
import { formatDate, getDifficultyColor } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
})

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user)
  const { data: analytics, isLoading: analyticsLoading } = useStudentAnalytics()
  const { data: semesters } = useSemesters()
  const { data: chatSessions } = useChatSessions()

  const quickActions = [
    { icon: MessageSquare, label: 'AI Chat', href: '/student/chat', color: 'from-violet-500 to-purple-600', desc: 'Ask anything' },
    { icon: Brain, label: 'Quiz', href: '/student/quizzes', color: 'from-orange-500 to-amber-500', desc: 'Test yourself' },
    { icon: Award, label: 'Flashcards', href: '/student/flashcards', color: 'from-green-500 to-emerald-500', desc: 'Quick revision' },
    { icon: BarChart2, label: 'Analytics', href: '/student/analytics', color: 'from-blue-500 to-cyan-500', desc: 'View progress' },
  ]

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <motion.div {...fadeUp()} className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</p>
              <h2 className="text-2xl font-bold mt-0.5">{user?.first_name} 👋</h2>
              <p className="text-white/80 text-sm mt-1">
                {analyticsLoading ? 'Loading...' : `${analytics?.chat_sessions_count || 0} chat sessions · ${analytics?.quiz_stats?.total || 0} quizzes completed`}
              </p>
            </div>
            <Avatar name={user?.full_name || ''} src={user?.avatar} size="xl" className="ring-4 ring-white/20" />
          </div>
          <div className="mt-6 flex gap-3">
            <Link to="/student/chat">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/20" size="sm">
                <MessageSquare className="h-4 w-4" /> Open AI Chat
              </Button>
            </Link>
            <Link to="/student/semesters">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" size="sm">
                View Semesters <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analyticsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            [
              { label: 'Quiz Attempts', value: analytics?.quiz_stats?.total || 0, icon: Brain, color: 'text-violet-500' },
              { label: 'Avg Score', value: `${(analytics?.quiz_stats?.avg_score || 0).toFixed(0)}%`, icon: TrendingUp, color: 'text-green-500' },
              { label: 'Assignments', value: analytics?.submissions_count || 0, icon: BookOpen, color: 'text-orange-500' },
              { label: 'AI Sessions', value: analytics?.chat_sessions_count || 0, icon: MessageSquare, color: 'text-blue-500' },
            ].map((stat, i) => (
              <motion.div key={stat.label} {...fadeUp(i * 0.05)}>
                <Card className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Quick Actions + Chart */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Quick Actions */}
          <motion.div {...fadeUp(0.1)}>
            <Card className="h-full">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link key={action.label} to={action.href}>
                    <motion.div whileHover={{ scale: 1.03 }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all cursor-pointer text-center">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.desc}</p>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Quiz Performance Chart */}
          <motion.div {...fadeUp(0.15)} className="md:col-span-2">
            <Card className="h-full">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" /> Recent Quiz Scores</h3>
              {analyticsLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : analytics?.recent_quiz_scores?.length ? (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={analytics.recent_quiz_scores.slice(0, 7).map(s => ({ name: s.quiz__title.slice(0, 12), score: s.score }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  No quiz attempts yet. <Link to="/student/quizzes" className="text-primary ml-1 hover:underline">Take a quiz →</Link>
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Semesters + Recent Chats */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Semesters */}
          <motion.div {...fadeUp(0.2)}>
            <Card className="h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Semesters</h3>
                <Link to="/student/semesters" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              <div className="space-y-2">
                {semesters?.results?.slice(0, 4).map((sem) => (
                  <Link key={sem.id} to={`/student/semesters/${sem.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {sem.number}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Semester {sem.number}</p>
                          <p className="text-xs text-muted-foreground">{sem.subjects_count} subjects</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                )) || <p className="text-sm text-muted-foreground">No semesters enrolled</p>}
              </div>
            </Card>
          </motion.div>

          {/* Recent AI Chats */}
          <motion.div {...fadeUp(0.25)}>
            <Card className="h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Recent Chats</h3>
                <Link to="/student/chat" className="text-xs text-primary hover:underline">Open chat</Link>
              </div>
              <div className="space-y-2">
                {chatSessions?.results?.slice(0, 4).map((session) => (
                  <Link key={session.id} to={`/student/chat?session=${session.id}`}>
                    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{session.title || 'New Chat'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {session.last_message?.content?.slice(0, 50) || 'No messages'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{session.message_count}m</span>
                    </div>
                  </Link>
                )) || (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-3">Start your first AI conversation</p>
                    <Link to="/student/chat"><Button size="sm"><MessageSquare className="h-4 w-4" /> Start Chat</Button></Link>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}
