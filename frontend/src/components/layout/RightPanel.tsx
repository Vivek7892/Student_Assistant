import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, Sparkles, X, ChevronRight, Paperclip, Mic } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Message { role: 'user' | 'assistant'; content: string }

const aiSuggestions = [
  { id: 1, text: 'Summarize my latest uploaded document' },
  { id: 2, text: 'Generate 5 quiz questions from my notes' },
  { id: 3, text: 'Explain the key concepts from today\'s material' },
]

const suggestedPrompts = [
  'What are the main topics I should focus on?',
  'Create a study plan for my upcoming exam',
  'Help me understand this concept better',
  'What are common mistakes students make here?',
]

export function RightPanel() {
  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  function send(text?: string) {
    const content = text ?? input.trim()
    if (!content) return
    setMessages(m => [
      ...m,
      { role: 'user', content },
      { role: 'assistant', content: `I'm analyzing your question about "${content.slice(0, 40)}…". Based on your current study materials, here's what I found:\n\nThis is a mock response. Connect the backend to get real AI-powered answers from your documents.` },
    ])
    setInput('')
  }

  return (
    <>
      {/* Toggle button when closed */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            onClick={() => setOpen(true)}
            className="fixed right-4 bottom-6 w-12 h-12 rounded-2xl bg-gradient-primary shadow-lift flex items-center justify-center text-white z-40"
          >
            <Bot size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col h-full bg-[var(--surface)] border-l border-[var(--border)] shrink-0 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[var(--border)]">
              <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-1)]">AI Assistant</p>
                <p className="text-xs text-[var(--text-3)]">Context-aware</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Messages / Suggestions */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
              {messages.length === 0 ? (
                <>
                  {/* AI suggestions */}
                  <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider px-1">Suggestions</p>
                  {aiSuggestions.map(s => (
                    <button key={s.id} onClick={() => send(s.text)}
                      className="w-full text-left p-2.5 rounded-xl bg-[var(--surface-2)] hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-[var(--border)] transition-colors group"
                    >
                      <p className="text-xs text-[var(--text-2)] group-hover:text-[var(--text-1)] leading-relaxed">{s.text}</p>
                    </button>
                  ))}

                  <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider px-1 pt-2">Ask me anything</p>
                  {suggestedPrompts.slice(0, 3).map((p, i) => (
                    <button key={i} onClick={() => send(p)}
                      className="w-full text-left flex items-center gap-2 p-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors group"
                    >
                      <ChevronRight size={12} className="text-primary-400 shrink-0" />
                      <span className="text-xs text-[var(--text-2)] group-hover:text-[var(--text-1)]">{p}</span>
                    </button>
                  ))}
                </>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                      m.role === 'user'
                        ? 'bg-gradient-primary text-white rounded-br-sm'
                        : 'bg-[var(--surface-2)] text-[var(--text-1)] rounded-bl-sm border border-[var(--border)]'
                    )}>
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[var(--border)]">
              <div className="flex items-end gap-2 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Ask about your materials…"
                  rows={2}
                  className="flex-1 bg-transparent text-xs text-[var(--text-1)] placeholder:text-[var(--text-3)] resize-none focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  <button className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"><Paperclip size={14} /></button>
                  <button className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"><Mic size={14} /></button>
                  <button onClick={() => send()}
                    className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center text-white hover:shadow-glass transition-shadow"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
