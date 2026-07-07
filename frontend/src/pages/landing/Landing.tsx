import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Bot, BookOpen, Brain, Zap, Star, ArrowRight, Check, GraduationCap, Flame,
  Sun, Moon, Youtube, Menu, X, MessageSquare, Layers, CalendarDays,
  FileText, BarChart3, PlaySquare, Sparkles, ShieldCheck, FolderOpen,
} from 'lucide-react'
import { useTheme } from '../../store/themeStore'
import { Logo } from '../../components/ui/Logo'

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }

const features = [
  {
    icon: Bot,
    title: 'AI Tutor — Powered by Gemini',
    desc: 'Chat with an AI that has read all your uploaded notes, PDFs, and slides. Get instant, cited answers — not generic web results.',
    color: 'primary',
    bullets: ['Contextual answers from your own materials', 'Cites exact source passages', 'Supports follow-up questions & conversation history'],
  },
  {
    icon: Brain,
    title: 'Smart Flashcards',
    desc: 'Spaced-repetition algorithm surfaces the right cards at the right time for maximum retention.',
    color: 'emerald',
    bullets: ['Auto-generated from your documents', 'SM-2 spaced repetition scheduling', 'Track mastery per subject'],
  },
  {
    icon: Zap,
    title: 'Adaptive Quizzes',
    desc: 'AI generates personalized quizzes based on your weak areas and upcoming exam schedule.',
    color: 'amber',
    bullets: ['MCQs auto-generated from study material', 'Difficulty adapts to your performance', 'Detailed explanations for every answer'],
  },
  {
    icon: BookOpen,
    title: 'Document RAG',
    desc: 'Upload PDFs, slides, and notes. AI indexes everything and answers with source citations.',
    color: 'cyan',
    bullets: ['Supports PDF, DOCX, PPTX, TXT', 'Semantic search across all uploads', 'Instant document summaries'],
  },
  {
    icon: Youtube,
    title: 'YouTube Learning Hub',
    desc: 'Add YouTube videos to any subject. Thumbnails, duration, and view counts are fetched automatically.',
    color: 'rose',
    bullets: ['Paste any YouTube link to save it', 'Auto-fetches title, thumbnail & duration', 'Organised per subject for easy access'],
  },
  {
    icon: Flame,
    title: 'Streak & Progress System',
    desc: 'Gamified daily streaks, XP, and achievements keep you motivated like Duolingo for academics.',
    color: 'amber',
    bullets: ['Daily study streaks & XP rewards', 'Progress rings per subject', 'Analytics dashboard to track growth'],
  },
]

const testimonials = [
  { name: 'Vivek V ',     role: 'CS Junior, Stanford',    avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Sarah',  text: 'StudyBuddy helped me go from a B- to an A in Algorithms. The AI tutor explains concepts better than my TA.',  rating: 5 },
  { name: 'Mahesh K', role: 'Pre-Med, Johns Hopkins',  avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Marcus', text: 'The spaced-repetition flashcards are insane. I memorized 500 biochemistry terms in 3 weeks.',            rating: 5 },
  { name: 'Tejonidhi M',    role: 'MBA, Wharton',           avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Priya',  text: 'Finally a study platform that feels like a real product. The design is beautiful and it actually works.', rating: 5 },
]

const colorBg: Record<string, string>   = { primary: 'bg-primary-100 dark:bg-primary-900/30', emerald: 'bg-emerald-400/10', amber: 'bg-amber-400/10', cyan: 'bg-cyan-400/10', rose: 'bg-rose-400/10' }
const colorText: Record<string, string> = { primary: 'text-primary-500', emerald: 'text-emerald-500', amber: 'text-amber-500', cyan: 'text-cyan-500', rose: 'text-rose-500' }

const NAV_LINKS = [
  { label: 'Quick links',   href: '#quick-links' },
  { label: 'Features',     href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
]

const quickLinks = [
  { icon: Bot, title: 'Ask AI Tutor', desc: 'Chat with your own documents and notes.', href: '/app/ai-tutor', color: 'primary' },
  { icon: FileText, title: 'Preview Docs', desc: 'Open PDFs, slides, notes, and summaries.', href: '/app/documents', color: 'cyan' },
  { icon: PlaySquare, title: 'Watch Later', desc: 'Save YouTube lessons with tags and folders.', href: '/app/videos', color: 'rose' },
  { icon: CalendarDays, title: 'Planner', desc: 'Schedule study sessions and sync Calendar.', href: '/app/planner', color: 'emerald' },
  { icon: BarChart3, title: 'Health Dashboard', desc: 'Track streaks, progress, and activity.', href: '/app/analytics', color: 'amber' },
  { icon: Brain, title: 'Flashcards', desc: 'Review smarter with repetition workflows.', href: '/app/flashcards', color: 'primary' },
]

const workspaceHighlights = [
  { icon: FolderOpen, title: 'Organized Study Hub', body: 'Keep documents, YouTube lessons, folders, notes, tags, and study tasks in one place.' },
  { icon: Sparkles, title: 'AI That Uses Your Material', body: 'Generate summaries, explanations, flashcards, and quizzes from the content you upload.' },
  { icon: ShieldCheck, title: 'Built For Student Workflow', body: 'Fast previews, clean dashboards, responsive layouts, and practical tools for daily study.' },
]

export default function Landing() {
  const { dark, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen mesh-bg">
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="font-display font-bold text-xl text-[var(--text-1)] tracking-tight">StudyBuddy</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-[var(--text-2)]">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} className="hover:text-[var(--text-1)] transition-colors">{l.label}</a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggle} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/login" className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-1)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-gradient-primary text-white text-sm font-medium hover:shadow-lift transition-shadow">
              Get started
            </Link>
            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(o => !o)} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] overflow-hidden"
            >
              <div className="px-6 py-4 space-y-3">
                {NAV_LINKS.map(l => (
                  <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)}
                    className="block text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors py-1">
                    {l.label}
                  </a>
                ))}
                <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                  <Link to="/login" onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-1)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors">
                    Sign in
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2 rounded-xl bg-gradient-primary text-white text-sm font-medium">
                    Get started
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 text-xs font-semibold border border-primary-200 dark:border-primary-800">
              ✦ AI-First Learning Platform
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-[var(--text-1)] leading-tight text-balance">
            Study smarter with<br /><span className="gradient-text">AI that knows</span><br />your curriculum
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-[var(--text-2)] max-w-2xl mx-auto leading-relaxed">
            StudyBuddy combines a context-aware AI tutor, spaced-repetition flashcards, adaptive quizzes, and deep analytics into one beautiful workspace.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-primary text-white font-semibold hover:shadow-lift transition-shadow">
              Start for free <ArrowRight size={16} />
            </Link>
            <a href="#features" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-1)] font-medium hover:bg-[var(--surface-2)] transition-colors">
              See how it works
            </a>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-[var(--text-3)]">
            {['AI tutor', 'Document previews', 'YouTube Watch Later', 'Calendar sync'].map(t => (
              <span key={t} className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> {t}</span>
            ))}
          </motion.div>
        </motion.div>

        {/* App preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-12 sm:mt-16 relative"
        >
          <div className="glass rounded-2xl sm:rounded-3xl p-1 shadow-glass-lg overflow-hidden">
            <div className="bg-[var(--surface)] rounded-xl sm:rounded-2xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex h-7 sm:h-8 items-center gap-1.5 px-4 bg-[var(--surface-2)] border-b border-[var(--border)]">
                {['bg-rose-400', 'bg-amber-400', 'bg-emerald-400'].map((c, i) => (
                  <div key={i} className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${c}`} />
                ))}
                <div className="flex-1 mx-4 h-3 sm:h-4 bg-[var(--border)] rounded-full" />
              </div>

              <div className="flex h-64 sm:h-96">
                {/* Sidebar */}
                <div className="hidden sm:flex flex-col w-44 border-r border-[var(--border)] p-3 gap-1">
                  {['Dashboard', 'AI Tutor', 'Courses', 'Flashcards', 'Analytics'].map((item, i) => (
                    <div key={item} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${i === 1 ? 'bg-primary-100 dark:bg-primary-900/30' : ''}`}>
                      <div className={`w-3 h-3 rounded-sm ${i === 1 ? 'bg-primary-500' : 'bg-[var(--border)]'}`} />
                      <div className={`h-2 rounded-full flex-1 ${i === 1 ? 'bg-primary-300 dark:bg-primary-700' : 'bg-[var(--border)]'}`} />
                    </div>
                  ))}
                </div>

                {/* Chat panel */}
                <div className="flex-1 flex flex-col">
                  {/* Chat header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <div className="w-6 h-6 rounded-lg bg-gradient-primary flex items-center justify-center">
                      <Bot size={13} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-1)] leading-none">AI Tutor</p>
                      <p className="text-[10px] text-emerald-500 mt-0.5">● Online · Gemini 1.5 Flash</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-hidden px-4 py-3 space-y-3">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="max-w-[72%] bg-gradient-primary text-white text-xs rounded-2xl rounded-tr-sm px-3 py-2 leading-relaxed">
                        Explain Newton's second law with an example
                      </div>
                    </div>
                    {/* AI message */}
                    <div className="flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={11} className="text-white" />
                      </div>
                      <div className="max-w-[78%] bg-[var(--surface-2)] border border-[var(--border)] text-xs rounded-2xl rounded-tl-sm px-3 py-2 space-y-1.5">
                        <p className="text-[var(--text-1)] leading-relaxed">
                          <span className="font-semibold">F = ma</span> — Force equals mass times acceleration.
                        </p>
                        <p className="text-[var(--text-2)] leading-relaxed">
                          A 2 kg ball pushed with 10 N accelerates at <span className="font-medium text-primary-500">5 m/s²</span>.
                        </p>
                        <div className="flex items-center gap-1 pt-0.5">
                          <div className="px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 text-[9px] font-medium">📄 Physics Notes p.12</div>
                        </div>
                      </div>
                    </div>
                    {/* Typing indicator */}
                    <div className="flex gap-2 items-center">
                      <div className="w-6 h-6 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                        <Bot size={11} className="text-white" />
                      </div>
                      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-3 py-2">
                        <div className="flex gap-1 items-center">
                          {[0,1,2].map(i => (
                            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-400"
                              animate={{ y: [0, -4, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input bar */}
                  <div className="px-3 py-2 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] px-3 py-1.5">
                      <p className="flex-1 text-xs text-[var(--text-3)]">Ask about your study materials…</p>
                      <div className="w-5 h-5 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <ArrowRight size={10} className="text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-primary opacity-10 blur-3xl" />
        </motion.div>
      </section>

      {/* Quick links */}
      <section id="quick-links" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-1)]">Jump straight into study mode</h2>
            <p className="text-[var(--text-2)] mt-2 max-w-2xl">Quick access to the tools students use every day inside StudyBuddy.</p>
          </div>
          <Link to="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-500 hover:underline">
            Open workspace <ArrowRight size={14} />
          </Link>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Link to={item.href} className="glass block rounded-2xl p-5 hover:shadow-glass transition-shadow">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorBg[item.color]}`}>
                  <item.icon size={19} className={colorText[item.color]} />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-semibold text-[var(--text-1)]">{item.title}</h3>
                    <p className="text-sm text-[var(--text-2)] mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--text-3)]" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="font-display text-4xl font-bold text-[var(--text-1)]">How it works</h2>
          <p className="text-[var(--text-2)] mt-3 max-w-xl mx-auto">Three simple steps to transform your study sessions.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: BookOpen,      step: '01', title: 'Upload your materials',  desc: 'Drop in your PDFs, slides, or notes. Our RAG pipeline indexes everything instantly.' },
            { icon: MessageSquare, step: '02', title: 'Chat with your AI tutor', desc: 'Ask questions in plain English. Get cited answers drawn directly from your own content.' },
            { icon: Layers,        step: '03', title: 'Reinforce with quizzes',  desc: "Auto-generated flashcards and quizzes lock in what you've learned before exam day." },
          ].map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 text-center hover:shadow-glass transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <s.icon size={22} className="text-white" />
              </div>
              <span className="text-xs font-bold text-[var(--primary)] tracking-widest">{s.step}</span>
              <h3 className="font-display font-semibold text-[var(--text-1)] mt-1 mb-2">{s.title}</h3>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="font-display text-4xl font-bold text-[var(--text-1)]">Everything you need to excel</h2>
          <p className="text-[var(--text-2)] mt-3 max-w-xl mx-auto">Built for serious students who want AI-powered tools that actually work with their curriculum.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-5 hover:shadow-glass transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorBg[f.color]}`}>
                <f.icon size={20} className={colorText[f.color]} />
              </div>
              <h3 className="font-display font-semibold text-[var(--text-1)] mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--text-2)] leading-relaxed mb-3">{f.desc}</p>
              <ul className="space-y-1">
                {f.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-[var(--text-3)]">
                    <Check size={11} className="text-emerald-500 mt-0.5 shrink-0" />{b}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workspace highlights */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="glass rounded-3xl overflow-hidden"
        >
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            <div className="p-7 sm:p-10 border-b lg:border-b-0 lg:border-r border-[var(--border)]">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 dark:bg-primary-900/30 px-3 py-1 text-xs font-semibold text-primary-600 dark:text-primary-300">
                <Sparkles size={13} /> Study workspace
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-1)] mt-4">Everything connects around your actual learning flow.</h2>
              <p className="text-[var(--text-2)] mt-4 leading-relaxed">
                Upload materials, save videos, plan sessions, ask AI, and watch your health dashboard update as you study.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  ['Docs', 'PDF/DOCX'],
                  ['Videos', 'Watch Later'],
                  ['Calendar', 'Sync'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="font-display text-lg font-bold text-[var(--text-1)]">{label}</p>
                    <p className="text-xs text-[var(--text-3)]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 sm:p-7 space-y-3">
              {workspaceHighlights.map(({ icon: Icon, title, body }, i) => (
                <motion.div key={title} initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex gap-4"
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <Icon size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-[var(--text-1)]">{title}</h3>
                    <p className="text-sm text-[var(--text-2)] mt-1 leading-relaxed">{body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="font-display text-4xl font-bold text-[var(--text-1)]">Loved by students</h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div key={t.name}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-5 space-y-4"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => <Star key={j} size={14} className="text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-sm text-[var(--text-1)] leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full" />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">{t.name}</p>
                  <p className="text-xs text-[var(--text-3)]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="glass rounded-3xl p-12 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-primary opacity-5" />
          <GraduationCap size={40} className="mx-auto text-primary-500 mb-4" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-1)] mb-3">Ready to transform how you study?</h2>
          <p className="text-[var(--text-2)] mb-6 max-w-lg mx-auto">Join thousands of students using StudyBuddy to study smarter, not harder.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-primary text-white font-semibold hover:shadow-lift transition-shadow">
            Get started for free <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center gap-2 sm:justify-between text-sm text-[var(--text-3)]">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-display font-bold text-[var(--text-2)]">StudyBuddy</span>
          </div>
          <p>© 2025 StudyBuddy. Built for students, by students.</p>
        </div>
      </footer>
    </div>
  )
}
