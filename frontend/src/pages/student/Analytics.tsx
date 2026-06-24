import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui'
import { useStudentAnalytics } from '@/api/analytics'
import { Skeleton } from '@/components/ui/Skeleton'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Brain, BookOpen, MessageSquare, Award } from 'lucide-react'

const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#10b981', '#f59e0b']

export default function StudentAnalytics() {
  const { data, isLoading } = useStudentAnalytics()

  const stats = [
    { label: 'Quiz Attempts', value: data?.quiz_stats?.total || 0, icon: Brain, color: 'text-violet-500' },
    { label: 'Avg Quiz Score', value: `${(data?.quiz_stats?.avg_score || 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-green-500' },
    { label: 'Assignments Submitted', value: data?.submissions_count || 0, icon: BookOpen, color: 'text-orange-500' },
    { label: 'Avg Assignment Score', value: `${(data?.avg_assignment_score || 0).toFixed(1)}%`, icon: Award, color: 'text-blue-500' },
    { label: 'AI Chat Sessions', value: data?.chat_sessions_count || 0, icon: MessageSquare, color: 'text-pink-500' },
  ]

  const quizChartData = data?.recent_quiz_scores?.slice(0, 10).map((s, i) => ({
    name: `Q${i + 1}`,
    score: Math.round(s.score),
    title: s.quiz__title,
  })) || []

  return (
    <DashboardLayout title="Learning Analytics">
      <div className="space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              {isLoading ? <Skeleton className="h-7 w-16" /> : <p className="text-xl font-bold">{stat.value}</p>}
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Quiz scores chart */}
          <Card>
            <h3 className="font-semibold mb-4">Quiz Performance History</h3>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={quizChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    formatter={(val: any, _: any, p: any) => [`${val}%`, p.payload.title]}
                  />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Submission status */}
          <Card>
            <h3 className="font-semibold mb-4">Assignment Overview</h3>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <div className="flex items-center justify-center h-48">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Graded', value: data?.graded_submissions || 0 },
                      { name: 'Pending', value: (data?.submissions_count || 0) - (data?.graded_submissions || 0) },
                    ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {[0, 1].map((i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
