import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { ChatSession, ChatMessage, Quiz, FlashcardDeck, StudyPlan, PaginatedResponse } from '../types'

// ── Chat ──────────────────────────────────────────────────────────────────────
export function useChatSessions() {
  return useQuery<PaginatedResponse<ChatSession>>({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get('/api/ai/sessions/').then(r => r.data),
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation<
    { message: ChatMessage; session_id: number },
    Error,
    { session_id?: number; content: string; material_ids?: number[] }
  >({
    mutationFn: (data) => api.post('/api/ai/sessions/chat/', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-sessions'] }),
  })
}

// ── Quizzes ───────────────────────────────────────────────────────────────────
export function useQuizzes() {
  return useQuery<PaginatedResponse<Quiz>>({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/api/ai/quizzes/').then(r => r.data),
  })
}

export function useGenerateQuiz() {
  const qc = useQueryClient()
  return useMutation<Quiz, Error, { subject_id: number; num_questions?: number; difficulty?: string }>({
    mutationFn: (data) => api.post('/api/ai/quizzes/generate/', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  })
}

export function useSubmitQuiz() {
  const qc = useQueryClient()
  return useMutation<{ score: number }, Error, { quiz_id: number; answers: number[] }>({
    mutationFn: ({ quiz_id, answers }) => api.post(`/api/ai/quizzes/${quiz_id}/submit/`, { answers }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  })
}

// ── Flashcards ────────────────────────────────────────────────────────────────
export function useFlashcardDecks() {
  return useQuery<PaginatedResponse<FlashcardDeck>>({
    queryKey: ['flashcard-decks'],
    queryFn: () => api.get('/api/ai/flashcards/').then(r => r.data),
  })
}

export function useGenerateFlashcards() {
  const qc = useQueryClient()
  return useMutation<FlashcardDeck, Error, { subject_id: number; num_cards?: number }>({
    mutationFn: (data) => api.post('/api/ai/flashcards/generate/', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcard-decks'] }),
  })
}

export function useUpdateFlashcard() {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: number; mastered: boolean }>({
    mutationFn: ({ id, mastered }) => api.patch(`/api/ai/flashcards/cards/${id}/`, { mastered }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcard-decks'] }),
  })
}

// ── Study Plan ────────────────────────────────────────────────────────────────
export function useGenerateStudyPlan() {
  return useMutation<StudyPlan, Error, { subject_ids: number[]; exam_date?: string }>({
    mutationFn: (data) => api.post('/api/ai/study-plans/generate/', data).then(r => r.data),
  })
}

// ── Summarize ─────────────────────────────────────────────────────────────────
export function useSummarize() {
  return useMutation<{ summary: string }, Error, { material_id: number }>({
    mutationFn: (data) => api.post('/api/ai/summarize/', data).then(r => r.data),
  })
}
