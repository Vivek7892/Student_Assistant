import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { AnalyticsData } from '@/types'

export function useStudentAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'student'],
    queryFn: () => api.get<AnalyticsData>('/analytics/student/').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useTeacherAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'teacher'],
    queryFn: () => api.get('/analytics/teacher/').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'admin'],
    queryFn: () => api.get('/analytics/admin/').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
}
