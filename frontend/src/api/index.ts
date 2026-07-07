import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Assignment, Notification, StudentAnalytics, UploadedFile, PaginatedResponse } from '../types'

// ── Assignments ───────────────────────────────────────────────────────────────
export function useAssignments() {
  return useQuery<PaginatedResponse<Assignment>>({
    queryKey: ['assignments'],
    queryFn: () => api.get('/api/assignments/').then(r => r.data),
  })
}

export function useSubmitAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      api.post(`/api/assignments/${id}/submit/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  })
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export function useStudentAnalytics() {
  return useQuery<StudentAnalytics>({
    queryKey: ['analytics', 'student'],
    queryFn: () => api.get('/api/analytics/student/').then(r => r.data),
  })
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function useNotifications() {
  return useQuery<PaginatedResponse<Notification>>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/api/notifications/').then(r => r.data),
    refetchInterval: 30_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.patch(`/api/notifications/${id}/`, { read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/notifications/mark-all-read/'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

// ── File Upload ───────────────────────────────────────────────────────────────
export function useUploadFile() {
  return useMutation<UploadedFile, Error, FormData>({
    mutationFn: (formData) =>
      api.post('/api/files/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  })
}
