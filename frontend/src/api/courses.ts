import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Semester, Subject, Material, PaginatedResponse } from '../types'

// ── Semesters ─────────────────────────────────────────────────────────────────
export function useSemesters() {
  return useQuery<PaginatedResponse<Semester>>({
    queryKey: ['semesters'],
    queryFn: () => api.get('/api/courses/semesters/').then(r => r.data),
  })
}

export function useCreateSemester() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Semester>) => api.post('/api/courses/semesters/', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['semesters'] }),
  })
}

// ── Subjects ──────────────────────────────────────────────────────────────────
export function useSubjects(semesterId?: number) {
  return useQuery<PaginatedResponse<Subject>>({
    queryKey: ['subjects', semesterId],
    queryFn: () => api.get('/api/courses/subjects/', { params: semesterId ? { semester: semesterId } : {} }).then(r => r.data),
  })
}

export function useCreateSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Subject>) => api.post('/api/courses/subjects/', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subjects'] }),
  })
}

// ── Materials ─────────────────────────────────────────────────────────────────
export function useMaterials(subjectId?: number) {
  return useQuery<PaginatedResponse<Material>>({
    queryKey: ['materials', subjectId],
    queryFn: () => api.get('/api/courses/materials/', { params: subjectId ? { subject: subjectId } : {} }).then(r => r.data),
  })
}

export function useUploadMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post('/api/courses/materials/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  })
}

export function useDeleteMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/courses/materials/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  })
}
