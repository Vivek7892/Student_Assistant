import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Bot, Loader2, Globe, Volume2, Paperclip, X, FileText, ChevronDown, BookOpen } from 'lucide-react'
import { Button, Avatar, Badge } from '@/components/ui'
import { useSendMessage, useChatSession } from '@/api/ai'
import { useMaterials } from '@/api/courses'
import { useAuthStore } from '@/store/authStore'
import { cn, formatRelativeTime } from '@/lib/utils'
import { ChatMessage } from '@/types'
import toast from 'react-hot-toast'
import api from '@/lib/api'

interface ChatInterfaceProps {
  sessionId?: string
  subjectId?: string
  materialId?: string
  onSessionCreated?: (id: string) => void
  placeholder?: string
}

const SUGGESTIONS = ['Explain this concept', 'Summarize the document', 'Give me key points', 'Create practice questions', 'What are the main topics?', 'Define important terms']

export function ChatInterface({ sessionId, subjectId, materialId: propMaterialId, onSessionCreated, placeholder }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [language, setLanguage] = useState<'english' | 'kannada'>('english')
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const [activeMaterialId, setActiveMaterialId] = useState<string | undefined>(propMaterialId)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [showMaterialPicker, setShowMaterialPicker] = useState(false)
  const [uploadedMaterial, setUploadedMaterial] = useState<{ id: string; title: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const user = useAuthStore((s) => s.user)

  const { data: session } = useChatSession(sessionId || '')
  const { mutate: sendMessage, isPending } = useSendMessage()
  const { data: materials } = useMaterials()

  const messages: ChatMessage[] = session?.messages ?? localMessages
  const currentMaterialId = activeMaterialId || propMaterialId

  const activeMaterial = uploadedMaterial
    || materials?.results?.find((m) => m.id === currentMaterialId)

  useEffect(() => { setActiveMaterialId(propMaterialId) }, [propMaterialId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isPending])

  // Upload a doc directly from chat and then use it as context
  const handleDocUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx', 'pptx', 'txt'].includes(ext || '')) {
      toast.error('Only PDF, DOCX, PPTX, TXT supported')
      return
    }
    setUploadingDoc(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', 'chat_upload')
      // Upload the file
      const { data: fileData } = await api.post('/files/upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      // Create a study material so RAG can index it
      const { data: material } = await api.post('/courses/materials/', {
        title: file.name.replace(/\.[^.]+$/, ''),
        subject: null,
        material_type: 'notes',
        file_url: fileData.public_url,
        file_name: file.name,
        file_size: file.size,
        file_type: ext?.toUpperCase() || 'FILE',
      })
      setUploadedMaterial({ id: material.id, title: material.title })
      setActiveMaterialId(material.id)
      toast.success(`"${material.title}" uploaded — AI is indexing it. You can start asking questions!`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Upload failed')
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleSend = () => {
    if (!input.trim() || isPending) return
    const messageText = input.trim()
    setInput('')

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      sources: [],
      tokens_used: 0,
      created_at: new Date().toISOString(),
    }

    if (!sessionId) {
      setLocalMessages((prev) => [...prev, tempUserMsg])
    }

    sendMessage(
      {
        message: messageText,
        session_id: sessionId,
        subject_id: subjectId,
        material_id: currentMaterialId,
        language,
      },
      {
        onSuccess: (data) => {
          if (!sessionId) {
            onSessionCreated?.(data.session_id)
            setLocalMessages([])
          }
        },
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = language === 'kannada' ? 'kn-IN' : 'en-US'
      window.speechSynthesis.speak(utt)
    }
  }

  const clearDocument = () => {
    setActiveMaterialId(undefined)
    setUploadedMaterial(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Document context bar */}
      {activeMaterial && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-primary/20">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-primary flex-1 truncate">
            Chatting about: {activeMaterial.title}
          </span>
          <Badge variant="default" className="text-xs shrink-0">Context Active</Badge>
          <button onClick={clearDocument} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center py-10 space-y-5"
          >
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Study Assistant</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                {activeMaterial
                  ? `Ask anything about "${activeMaterial.title}" and I'll answer from the document.`
                  : placeholder || 'Upload a document or select a study material, then ask me anything about it.'}
              </p>
            </div>

            {/* Upload / Select doc prompt */}
            {!activeMaterial && (
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium text-primary"
                >
                  <Paperclip className="h-4 w-4" /> Upload Document
                </button>
                <button
                  onClick={() => setShowMaterialPicker(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-all text-sm font-medium"
                >
                  <BookOpen className="h-4 w-4" /> Select Material
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {SUGGESTIONS.slice(0, activeMaterial ? 6 : 4).map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-left text-xs p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
            >
              {message.role === 'user' ? (
                <Avatar name={user?.full_name || 'You'} src={user?.avatar} size="sm" />
              ) : (
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={cn('flex flex-col gap-1 max-w-[80%]', message.role === 'user' && 'items-end')}>
                <div className={cn(
                  'rounded-2xl px-4 py-3 text-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted rounded-tl-sm'
                )}>
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>

                {message.role === 'assistant' && message.sources?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {message.sources.slice(0, 3).map((s, i) => (
                      <span key={i} title={s.content} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full cursor-help">
                        📄 Source {i + 1}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(message.created_at)}</span>
                  {message.role === 'assistant' && (
                    <button onClick={() => speak(message.content)} className="text-muted-foreground hover:text-foreground transition-colors" title="Read aloud">
                      <Volume2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Material picker dropdown */}
      <AnimatePresence>
        {showMaterialPicker && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-4 mb-2 border border-border rounded-2xl bg-card shadow-lg max-h-60 overflow-y-auto"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium">Select Study Material</span>
              <button onClick={() => setShowMaterialPicker(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {materials?.results?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No study materials found</p>
            )}
            {materials?.results?.map((m) => (
              <button
                key={m.id}
                disabled={!m.is_processed}
                onClick={() => { setActiveMaterialId(m.id); setUploadedMaterial(null); setShowMaterialPicker(false) }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-all text-left',
                  !m.is_processed && 'opacity-50 cursor-not-allowed',
                  currentMaterialId === m.id && 'bg-primary/10'
                )}
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.subject_name} · {m.file_type}</p>
                </div>
                {!m.is_processed && <span className="text-xs text-orange-500">Processing...</span>}
                {m.is_processed && currentMaterialId === m.id && <span className="text-xs text-primary">Active</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2 bg-muted/50 border border-border rounded-2xl p-2">
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'english' ? 'kannada' : 'english')}
            className={cn(
              'p-2 rounded-xl text-xs font-medium transition-all shrink-0',
              language === 'kannada' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            )}
            title="Toggle language"
          >
            <Globe className="h-4 w-4" />
          </button>

          {/* Attach doc */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingDoc}
            className="p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all shrink-0"
            title="Upload document for AI context"
          >
            {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>

          {/* Select material */}
          <button
            onClick={() => setShowMaterialPicker(!showMaterialPicker)}
            className={cn(
              'p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all shrink-0',
              showMaterialPicker && 'bg-accent text-foreground'
            )}
            title="Select study material"
          >
            <BookOpen className="h-4 w-4" />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              uploadingDoc
                ? 'Uploading document...'
                : activeMaterial
                ? `Ask about "${activeMaterial.title}"...`
                : language === 'kannada'
                ? 'ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಕೇಳಿ...'
                : 'Ask a question... (upload a doc or select a material for context)'
            }
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground min-h-[36px] max-h-32 py-2 px-1"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isPending || uploadingDoc}
            size="icon"
            className="shrink-0 rounded-xl"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-muted-foreground">
            {language === 'kannada' ? '🇮🇳 ಕನ್ನಡ ಮೋಡ್' : 'Enter to send · Shift+Enter new line'}
          </p>
          {activeMaterial && (
            <button onClick={clearDocument} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              Clear document
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.pptx,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleDocUpload(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
