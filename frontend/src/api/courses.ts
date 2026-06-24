import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { Semester, Subject, StudyMaterial, PaginatedResponse } from '@/types'

export function useSemesters(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['semesters', params],
    queryFn: () => api.get<PaginatedResponse<Semester>>('/courses/semesters/', { params }).then((r) => r.data),
  })
}

export function useSemester(id: string) {
  return useQuery({
    queryKey: ['semesters', id],
    queryFn: () => api.get<Semester>(`/courses/semesters/${id}/`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useSemesterSubjects(semesterId: string) {
  return useQuery({
    queryKey: ['subjects', 'semester', semesterId],
    queryFn: () => api.get<Subject[]>(`/courses/semesters/${semesterId}/subjects/`).then((r) => r.data),
    enabled: !!semesterId,
  })
}

export function useSubjects(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['subjects', params],
    queryFn: () => api.get<PaginatedResponse<Subject>>('/courses/subjects/', { params }).then((r) => r.data),
  })
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: ['subjects', id],
    queryFn: () => api.get<Subject>(`/courses/subjects/${id}/`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useMaterials(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['materials', params],
    queryFn: () => api.get<PaginatedResponse<StudyMaterial>>('/courses/materials/', { params }).then((r) => r.data),
  })
}

export function useSubjectMaterials(subjectId: string, type?: string) {
  return useQuery({
    queryKey: ['materials', 'subject', subjectId, type],
    queryFn: () =>
      api.get<StudyMaterial[]>(`/courses/subjects/${subjectId}/materials/`, {
        params: type ? { type } : {},
      }).then((r) => r.data),
    enabled: !!subjectId,
  })
}

export function useCreateSemester() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Semester>) => api.post<Semester>('/courses/semesters/', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['semesters'] }); toast.success('Semester created') },
    onError: () => toast.error('Failed to create semester'),
  })
}

export function useCreateSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Subject>) => api.post<Subject>('/courses/subjects/', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast.success('Subject created') },
    onError: () => toast.error('Failed to create subject'),
  })
}

export function useUploadMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<StudyMaterial>) =>
      api.post<StudyMaterial>('/courses/materials/', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Material uploaded and queued for AI processing')
    },
    onError: () => toast.error('Upload failed'),
  })
}

export function useDeleteMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/courses/materials/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); toast.success('Material deleted') },
    onError: () => toast.error('Failed to delete material'),
  })
}

export function useEnrollSemester() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (semesterId: string) =>
      api.post(`/courses/semesters/${semesterId}/enroll/`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['semesters'] }); toast.success('Enrolled successfully') },
    onError: () => toast.error('Enrollment failed'),
  })
}
