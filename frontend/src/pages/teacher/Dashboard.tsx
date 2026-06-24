import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, Users, BarChart2, FileText, Brain, Award, ArrowRight, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Button, Badge } from '@/components/ui'
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/store/authStore'
import { useTeacherAnalytics } from '@/api/analytics'

const fadeUp = (d = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: d } })

export default function TeacherDashboard() {
  const user = useAuthStore((s) => s.user)
  const { data: analytics, isLoading } = useTeacherAnalytics()

  const stats = [
    { label: 'My Subjects', value: analytics?.subjects_count || 0, icon: BookOpen, color: 'text-violet-500', href: '/teacher/subjects' },
    { label: 'Total Students', value: analytics?.total_students || 0, icon: Users, color: 'text-blue-500', href: '/teacher/analytics' },
    { label: 'Assignments', value: analytics?.assignments_count || 0, icon: FileText, color: 'text-orange-500', href: '/teacher/assignments' },
    { label: 'Pending Grading', value: analytics?.pending_grading || 0, icon: Clock, color: 'text-red-500', href: '/teacher/assignments' },
    { label: 'Materials Uploaded', value: analytics?.materials_uploaded || 0, icon: Award, color: 'text-green-500', href: '/teacher/materials' },
  ]

  const quickActions = [
    { label: 'Upload Material', href: '/teacher/materials', color: 'from-violet-500 to-purple-600', icon: FileText },
    { label: 'Create Quiz', href: '/teacher/quizzes', color: 'from-orange-500 to-amber-500', icon: Brain },
    { label: 'New Assignment', href: '/teacher/assignments', color: 'from-blue-500 to-cyan-500', icon: BookOpen },
    { label: 'View Analytics', href: '/teacher/analytics', color: 'from-green-500 to-emerald-500', icon: BarChart2 },
  ]

  return (
    <DashboardLayout title="Teacher Dashboard">
      <div className="space-y-6">
        {/* Welcome banner */}
        <motion.div {...fadeUp()} className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold">Welcome, {user?.first_name} 👋</h2>
          <p className="text-white/80 text-sm mt-1">
            {analytics?.pending_grading
              ? `You have ${analytics.pending_grading} submissions pending grading.`
              : 'All caught up! No pending grading.'}
          </p>
          <div className="flex gap-3 mt-4">
            <Link to="/teacher/assignments"><Button className="bg-white/20 hover:bg-white/30 text-white" size="sm">Review Submissions</Button></Link>
            <Link to="/teacher/materials"><Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" size="sm">Upload Material <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {isLoading ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />) :
            stats.map((stat, i) => (
              <motion.div key={stat.label} {...fadeUp(i * 0.05)}>
                <Link to={stat.href}>
                  <Card hover className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </Card>
                </Link>
              </motion.div>
            ))}
        </div>

        {/* Quick Actions */}
        <motion.div {...fadeUp(0.2)}>
          <Card>
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((a) => (
                <Link key={a.label} to={a.href}>
                  <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all">
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center shrink-0`}>
                      <a.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{a.label}</span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
