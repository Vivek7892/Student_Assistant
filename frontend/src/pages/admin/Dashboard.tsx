import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Users, Layers, BookOpen, Brain, BarChart2, Settings, Shield, TrendingUp, Activity } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Badge } from '@/components/ui'
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { useAdminAnalytics } from '@/api/analytics'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981']
const fadeUp = (d = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: d } })

export default function AdminDashboard() {
  const { data: analytics, isLoading } = useAdminAnalytics()

  const stats = [
    { label: 'Total Users', value: analytics?.total_users || 0, icon: Users, color: 'text-violet-500' },
    { label: 'Students', value: analytics?.students || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Teachers', value: analytics?.teachers || 0, icon: Shield, color: 'text-green-500' },
    { label: 'Semesters', value: analytics?.total_semesters || 0, icon: Layers, color: 'text-orange-500' },
    { label: 'Subjects', value: analytics?.total_subjects || 0, icon: BookOpen, color: 'text-pink-500' },
    { label: 'Study Materials', value: analytics?.total_materials || 0, icon: Brain, color: 'text-cyan-500' },
  ]

  const adminLinks = [
    { label: 'User Management', href: '/admin/users', icon: Users, desc: 'Manage all platform users' },
    { label: 'Semester Management', href: '/admin/semesters', icon: Layers, desc: 'Create and manage semesters' },
    { label: 'Subject Management', href: '/admin/subjects', icon: BookOpen, desc: 'Manage all subjects' },
    { label: 'AI Analytics', href: '/admin/ai-analytics', icon: Brain, desc: 'Monitor AI usage and costs' },
    { label: 'Platform Analytics', href: '/admin/analytics', icon: BarChart2, desc: 'View platform-wide metrics' },
    { label: 'System Settings', href: '/admin/settings', icon: Settings, desc: 'Configure platform settings' },
  ]

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <motion.div {...fadeUp()} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-5 w-5 text-violet-400" />
            <h2 className="text-xl font-bold">Admin Control Center</h2>
          </div>
          <p className="text-slate-400 text-sm">Platform overview and management tools</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoading ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />) :
            stats.map((stat, i) => (
              <motion.div key={stat.label} {...fadeUp(i * 0.05)}>
                <Card className="text-center space-y-2">
                  <stat.icon className={`h-5 w-5 mx-auto ${stat.color}`} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </Card>
              </motion.div>
            ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div {...fadeUp(0.1)}>
            <Card>
              <h3 className="font-semibold mb-4">Users by Role</h3>
              {isLoading ? <Skeleton className="h-48 w-full" /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={analytics?.users_by_role || []} cx="50%" cy="50%" outerRadius={70} dataKey="count" nameKey="role">
                      {(analytics?.users_by_role || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </motion.div>

          <motion.div {...fadeUp(0.15)}>
            <Card>
              <h3 className="font-semibold mb-4">Materials by Type</h3>
              {isLoading ? <Skeleton className="h-48 w-full" /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics?.materials_by_type || []}>
                    <XAxis dataKey="material_type" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Admin links - Bento grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {adminLinks.map((link, i) => (
            <motion.div key={link.label} {...fadeUp(i * 0.05)}>
              <Link to={link.href}>
                <Card hover className="space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <link.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{link.label}</h3>
                    <p className="text-sm text-muted-foreground">{link.desc}</p>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
