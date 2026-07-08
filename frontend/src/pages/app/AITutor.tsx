import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Plus, Bot, User, BookOpen, Sparkles,
  ChevronLeft, Trash2, Copy, Check, Menu,
} from 'lucide-react'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

interface Source { content: string; metadata: Record<string, any> }
interface Message { id: string; role: 'user' | 'assistant'; content: string; sources?: Source[] }
interface Session { id: string; title: string; updated_at: string }

const SUGGESTED = [
  'Summarize the key concepts from my latest upload',
  'Generate 5 practice questions on this topic',
  'Explain this concept with a real-world example',
  'What are the most important points to remember?',
]

// Minimal markdown renderer: bold, inline code, code blocks, bullets, numbered lists
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="my-2 max-w-full overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-xs font-mono leading-relaxed">
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      i++
      continue
    }

    // Heading
    if (line.startsWith('### ')) {
      elements.push(<p key={i} className="font-semibold text-[var(--text-1)] mt-3 mb-1">{renderInline(line.slice(4))}</p>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<p key={i} className="font-bold text-[var(--text-1)] mt-3 mb-1 text-base">{renderInline(line.slice(3))}</p>)
      i++; continue
    }

    // Bullet list
    if (line.match(/^[-*] /)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={i} className="my-1.5 space-y-1 pl-4">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm">
              <span className="text-[var(--primary)] mt-1.5 shrink-0">•</span>
              <span className="min-w-0 break-words">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const items: string[] = []
      let num = 1
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={i} className="my-1.5 space-y-1 pl-4">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm">
              <span className="text-[var(--primary)] shrink-0 font-medium">{j + 1}.</span>
              <span className="min-w-0 break-words">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />)
      i++; continue
    }

    // Normal paragraph
    elements.push(<p key={i} className="break-words text-sm leading-relaxed">{renderInline(line)}</p>)
    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-[var(--text-1)]">{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="break-words rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 text-xs font-mono text-[var(--primary)]">{part.slice(1, -1)}</code>
    return part
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

export default function AITutor() {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionId, setSessionId] = useState<string | null>(urlSessionId ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    api.get('/api/ai/sessions/')
      .then(r => setSessions(Array.isArray(r.data) ? r.data : r.data.results ?? []))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false))
  }, [])

  // Load session from URL param on mount
  useEffect(() => {
    if (urlSessionId) loadSession(urlSessionId)
  }, [urlSessionId])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  async function loadSession(id: string) {
    setSessionId(id)
    setShowSidebar(false)
    navigate(`/app/ai/c/${id}`, { replace: true })
    try {
      const r = await api.get(`/api/ai/sessions/${id}/`)
      setMessages(r.data.messages ?? [])
    } catch {
      setMessages([])
    }
  }

  function newChat() {
    setSessionId(null)
    setMessages([])
    setInput('')
    setShowSidebar(false)
    navigate('/app/ai', { replace: true })
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await api.delete(`/api/ai/sessions/${id}/`).catch(() => {})
    setSessions(s => s.filter(x => x.id !== id))
    if (sessionId === id) newChat()
  }

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content }
    setMessages(m => [...m, userMsg])
    setLoading(true)

    try {
      const r = await api.post('/api/ai/sessions/chat/', {
        message: content,
        session_id: sessionId ?? undefined,
      })
      const { session_id, assistant_message } = r.data

      if (!sessionId) {
        setSessionId(session_id)
        // Update URL to session-specific token (like /app/ai/c/<uuid>)
        navigate(`/app/ai/c/${session_id}`, { replace: true })
        api.get('/api/ai/sessions/')
          .then(res => setSessions(Array.isArray(res.data) ? res.data : res.data.results ?? []))
          .catch(() => {})
      }

      setMessages(m => [...m, {
        id: assistant_message.id,
        role: 'assistant',
        content: assistant_message.content,
        sources: assistant_message.sources ?? [],
      }])
    } catch (err: any) {
      const errMsg = err?.response?.data?.error
        ?? err?.response?.data?.detail
        ?? err?.message
        ?? 'Something went wrong. Please try again.'
      setMessages(m => [...m, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Warning: ${errMsg}`,
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId, navigate])

  const SessionList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[var(--border)]">
        <button
          onClick={newChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-primary text-white text-sm font-medium hover:shadow-glass transition-shadow"
        >
          <Plus size={15} /> New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
        {sessionsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-xl skeleton" />)
        ) : sessions.length === 0 ? (
          <p className="text-xs text-[var(--text-3)] px-2 py-3 text-center">No conversations yet</p>
        ) : (
          sessions.map(s => (
            <div key={s.id}
              className={cn(
                'group w-full flex items-center gap-1 px-3 py-2.5 rounded-xl transition-colors cursor-pointer',
                sessionId === s.id
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300'
                  : 'hover:bg-[var(--surface-2)] text-[var(--text-2)]'
              )}
              onClick={() => loadSession(s.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{s.title || 'Untitled'}</p>
                <p className="text-xs text-[var(--text-3)] mt-0.5">
                  {new Date(s.updated_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => deleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-500 transition-all shrink-0"
                title="Delete conversation"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[520px] -m-4 overflow-hidden md:-m-6 md:h-[calc(100vh-3.5rem)]">
      {/* Desktop session sidebar */}
      <div className="hidden md:flex w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="w-full">
          <SessionList />
        </div>
      </div>

      {/* Mobile session drawer */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-[var(--surface)] border-r border-[var(--border)] md:hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="font-display font-semibold text-sm text-[var(--text-1)]">Conversations</span>
                <button onClick={() => setShowSidebar(false)} className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-2)]">
                  <ChevronLeft size={16} />
                </button>
              </div>
              <SessionList />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--surface)]">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0">
          <button
            onClick={() => setShowSidebar(true)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <Menu size={16} />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Bot size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-1)]">AI Tutor</p>
            <p className="truncate text-xs text-[var(--text-3)]">Powered by Gemini 2.0 Flash · RAG on your materials</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-5 py-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lift">
                <Sparkles size={24} className="text-white" />
              </div>
              <div className="text-center">
                <h3 className="font-display text-lg font-bold text-[var(--text-1)]">Ask me anything</h3>
                <p className="text-sm text-[var(--text-2)] mt-1">I have access to all your study materials</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED.map((p, i) => (
                  <button key={i} onClick={() => send(p)}
                    className="text-left p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    <p className="text-xs text-[var(--text-2)]">{p}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <motion.div key={m.id ?? i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={15} className="text-white" />
                </div>
              )}

              <div className={cn('max-w-[82%] min-w-0 space-y-2 sm:max-w-[85%] md:max-w-[75%]', m.role === 'user' && 'items-end flex flex-col')}>
                <div className={cn(
                  'max-w-full overflow-hidden rounded-2xl px-4 py-3',
                  m.role === 'user'
                    ? 'bg-gradient-primary text-white rounded-tr-sm text-sm leading-relaxed'
                    : 'bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border)] rounded-tl-sm'
                )}>
                  {m.role === 'user'
                    ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</p>
                    : <MarkdownContent content={m.content} />
                  }
                </div>

                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 px-1">
                    <CopyButton text={m.content} />
                    {m.sources && m.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.sources.map((s, j) => (
                          <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 text-xs">
                            <BookOpen size={9} /> {s.metadata?.source ?? `Source ${j + 1}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
                  <User size={15} className="text-[var(--text-2)]" />
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                <Bot size={15} className="text-white" />
              </div>
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-2 h-2 rounded-full bg-primary-400"
                      animate={{ y: [0, -5, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 md:p-4 border-t border-[var(--border)] shrink-0">
          <div className="flex items-end gap-2 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] px-3 py-2.5 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask about your study materials..."
              rows={1}
              style={{ resize: 'none', minHeight: '24px', maxHeight: '120px' }}
              className="flex-1 bg-transparent text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none leading-relaxed"
            />
            <button onClick={() => send()}
              className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center text-white hover:shadow-lift transition-shadow disabled:opacity-40 shrink-0"
              disabled={!input.trim() || loading}
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-xs text-[var(--text-3)] text-center mt-2 hidden sm:block">
            Powered by Gemini 2.0 Flash · Answers grounded in your uploaded study materials
          </p>
        </div>
      </div>
    </div>
  )
}
