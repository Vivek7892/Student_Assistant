import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { ChatSession, ChatMessage, Quiz, Flashcard, StudyPlan, PaginatedResponse } from '@/types'

export function useChatSessions() {
  return useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get<PaginatedResponse<ChatSession>>('/ai/sessions/').then((r) => r.data),
  })
}

export function useChatSession(id: string) {
  return useQuery({
    queryKey: ['chat-sessions', id],
    queryFn: () => api.get<ChatSession>(`/ai/sessions/${id}/`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      message: string
      session_id?: string
      subject_id?: string
      material_id?: string
      language?: string
    }) =>
      api.post<{
        session_id: string
        user_message: ChatMessage
        assistant_message: ChatMessage
      }>('/ai/sessions/chat/', data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['chat-sessions'] })
      if (vars.session_id) {
        qc.invalidateQueries({ queryKey: ['chat-sessions', vars.session_id] })
      }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || error?.response?.data?.detail || 'Failed to send message. Check your connection.'
      toast.error(msg)
    },
  })
}

export function useDeleteChatSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ai/sessions/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chat-sessions'] }); toast.success('Chat deleted') },
  })
}

export function useQuizzes(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['quizzes', params],
    queryFn: () => api.get<PaginatedResponse<Quiz>>('/ai/quizzes/', { params }).then((r) => r.data),
  })
}

export function useGenerateQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { material_id: string; num_questions: number; difficulty: string; title?: string }) =>
      api.post<Quiz>('/ai/quizzes/generate/', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quizzes'] }); toast.success('Quiz generated!') },
    onError: () => toast.error('Failed to generate quiz'),
  })
}

export function useSubmitQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ quizId, answers, time_taken_seconds }: { quizId: string; answers: any[]; time_taken_seconds: number }) =>
      api.post(`/ai/quizzes/${quizId}/submit/`, { answers, time_taken_seconds }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['analytics'] }); toast.success('Quiz submitted!') },
  })
}

export function useFlashcards(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['flashcards', params],
    queryFn: () => api.get<PaginatedResponse<Flashcard>>('/ai/flashcards/', { params }).then((r) => r.data),
  })
}

export function useGenerateFlashcards() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { material_id: string; num_cards: number; title?: string }) =>
      api.post<Flashcard>('/ai/flashcards/generate/', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flashcards'] }); toast.success('Flashcards generated!') },
    onError: () => toast.error('Failed to generate flashcards'),
  })
}

export function useStudyPlans() {
  return useQuery({
    queryKey: ['study-plans'],
    queryFn: () => api.get<PaginatedResponse<StudyPlan>>('/ai/study-plans/').then((r) => r.data),
  })
}

export function useGenerateStudyPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { subject_ids: string[]; duration_days: number; exam_date: string; title?: string }) =>
      api.post('/ai/study-plans/generate/', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['study-plans'] }); toast.success('Study plan generated!') },
    onError: () => toast.error('Failed to generate study plan'),
  })
}

export function useSummarize() {
  return useMutation({
    mutationFn: (material_id: string) =>
      api.post<{ summary: string }>('/ai/summarize/', { material_id }).then((r) => r.data),
    onError: () => toast.error('Failed to summarize document'),
  })
}
