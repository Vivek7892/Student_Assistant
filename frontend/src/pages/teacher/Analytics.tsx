import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { useTeacherAnalytics } from '@/api/analytics'
import { BookOpen, Users, FileText, Clock, Award, TrendingUp } from 'lucide-react'

export default function TeacherAnalytics() {
  const { data, isLoading } = useTeacherAnalytics()

  const stats = [
    { label: 'My Subjects', value: data?.subjects_count || 0, icon: BookOpen, color: 'text-violet-500' },
    { label: 'Total Students', value: data?.total_students || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Assignments Created', value: data?.assignments_count || 0, icon: FileText, color: 'text-orange-500' },
    { label: 'Pending Grading', value: data?.pending_grading || 0, icon: Clock, color: 'text-red-500' },
    { label: 'Materials Uploaded', value: data?.materials_uploaded || 0, icon: Award, color: 'text-green-500' },
  ]

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              {isLoading ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-bold">{stat.value}</p>}
            </Card>
          ))}
        </div>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Overview</h3>
          </div>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Grading completion', value: data?.assignments_count ? Math.round(((data.assignments_count - data.pending_grading) / data.assignments_count) * 100) : 0, color: 'bg-green-500' },
                { label: 'Materials per subject', value: data?.subjects_count ? Math.round((data.materials_uploaded || 0) / data.subjects_count) : 0, display: `${data?.materials_uploaded || 0} total`, color: 'bg-violet-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.display || `${item.value}%`}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${Math.min(item.value, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
