import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Brain, Zap, BookOpen, BarChart2, MessageSquare, Award,
  ChevronDown, ArrowRight, Star, Check, Github, Users,
  FileText, Layers, Globe, Mic
} from 'lucide-react'
import { Button, Card } from '@/components/ui'

const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } }

const features = [
  { icon: Brain, title: 'RAG-Powered AI', desc: 'Upload documents and get instant AI answers with source citations from your study materials.', color: 'from-violet-500 to-purple-600', span: 'col-span-2' },
  { icon: MessageSquare, title: 'Multi-language Chat', desc: 'Chat in English and Kannada', color: 'from-blue-500 to-cyan-500', span: '' },
  { icon: Mic, title: 'Voice Interaction', desc: 'Speak your questions out loud', color: 'from-pink-500 to-rose-500', span: '' },
  { icon: FileText, title: 'Smart Quizzes', desc: 'Auto-generate MCQ quizzes from any uploaded document using AI.', color: 'from-orange-500 to-amber-500', span: '' },
  { icon: Award, title: 'Flashcards', desc: 'AI generates study flashcards from your notes instantly.', color: 'from-green-500 to-emerald-500', span: '' },
  { icon: BarChart2, title: 'Learning Analytics', desc: 'Track progress, quiz scores, and learning patterns with detailed analytics.', color: 'from-indigo-500 to-violet-500', span: 'col-span-2' },
]

const stats = [
  { value: '10,000+', label: 'Active Students' },
  { value: '500+', label: 'Teachers' },
  { value: '1M+', label: 'AI Queries' },
  { value: '98%', label: 'Satisfaction Rate' },
]

const steps = [
  { step: '01', title: 'Upload Materials', desc: 'Upload PDFs, DOCX, PPTX, or TXT study materials to the platform.' },
  { step: '02', title: 'AI Processing', desc: 'Our RAG pipeline extracts text, generates embeddings, and indexes content.' },
  { step: '03', title: 'Ask Anything', desc: 'Chat with AI, generate quizzes, flashcards, and study plans instantly.' },
  { step: '04', title: 'Track Progress', desc: 'Monitor performance with detailed analytics and personalized insights.' },
]

const testimonials = [
  { name: 'Priya Sharma', role: 'Engineering Student', text: 'EduAI transformed how I study. The AI chatbot explains concepts from my notes instantly. My grades improved by 30%!', rating: 5 },
  { name: 'Dr. Ravi Kumar', role: 'Professor, VTU', text: 'As a teacher, I can now upload materials and track student engagement with AI analytics. Absolutely game-changing.', rating: 5 },
  { name: 'Aditya Nair', role: 'Final Year Student', text: 'Auto-generated quizzes from my notes save me hours of preparation. The Kannada support is amazing!', rating: 5 },
]

const faqs = [
  { q: 'What file formats are supported?', a: 'We support PDF, DOCX, PPTX, and TXT files up to 50MB each.' },
  { q: 'How does the AI answer questions?', a: 'Using RAG (Retrieval-Augmented Generation), the AI retrieves relevant chunks from your uploaded documents and generates contextual answers.' },
  { q: 'Is my data secure?', a: 'Yes. All files are stored securely in Supabase Storage with row-level security. Your data is never shared.' },
  { q: 'Can I use it in Kannada?', a: 'Yes! Our AI supports both English and Kannada for questions and answers.' },
  { q: 'Is there a free plan?', a: 'Students can access all core features for free. Premium plans add advanced analytics and unlimited storage.' },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">EduAI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link to="/register"><Button size="sm">Get Started <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Zap className="h-3.5 w-3.5" />
              AI-Powered Learning Platform
            </span>
          </motion.div>
          <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Study Smarter with
            <span className="gradient-text block">AI-Powered Learning</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your study materials. Get instant AI answers, auto-generated quizzes, flashcards, and personalized study plans — in English and Kannada.
          </motion.p>
          <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register">
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
                Start Learning Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </motion.div>

          {/* Hero preview */}
          <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="mt-16 relative">
            <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              <div className="bg-muted/50 border-b border-border px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  {['bg-red-400', 'bg-yellow-400', 'bg-green-400'].map((c) => <div key={c} className={`h-3 w-3 rounded-full ${c}`} />)}
                </div>
                <div className="flex-1 mx-4 bg-background rounded-lg h-6 px-3 flex items-center text-xs text-muted-foreground">
                  app.eduai.in/student/chat
                </div>
              </div>
              <div className="p-6 bg-background min-h-48 flex items-center justify-center">
                <div className="space-y-4 w-full max-w-lg">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-xs">
                      Hello! I've processed your Operating Systems notes. Ask me anything about processes, memory management, or file systems.
                    </div>
                  </div>
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">PS</div>
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-xs">
                      What is the difference between process and thread?
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-sm">
                      Based on your notes: A <strong>process</strong> is an independent program in execution with its own memory space, while a <strong>thread</strong> is a lightweight unit of execution within a process that shares memory...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <motion.div key={stat.label} {...fadeUp} className="text-center">
              <p className="text-3xl font-bold gradient-text">{stat.value}</p>
              <p className="text-muted-foreground text-sm mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features — Bento Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to excel</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">A complete AI-first learning platform built for modern students and teachers.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div key={f.title} {...fadeUp} transition={{ delay: i * 0.08 }} className={`bento-card hover:shadow-xl group ${f.span}`}>
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground text-lg">Get started in minutes with our RAG-powered pipeline.</p>
          </motion.div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div key={s.step} {...fadeUp} transition={{ delay: i * 0.1 }} className="relative">
                <div className="text-5xl font-black text-muted/40 mb-3">{s.step}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 -right-3 text-muted-foreground">→</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by students & teachers</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} {...fadeUp} transition={{ delay: i * 0.1 }} className="bento-card">
                <div className="flex mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-muted/20">
        <div className="max-w-2xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently asked questions</h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.05 }} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.q}
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp} className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start your AI learning journey today</h2>
            <p className="text-white/80 text-lg mb-8">Free forever for students. Join thousands of learners already using EduAI.</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/register">
                <Button size="lg" className="bg-white text-violet-700 hover:bg-white/90 shadow-xl">
                  Get Started — It's Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <Brain className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold gradient-text">EduAI</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              <a href="https://github.com" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Github className="h-4 w-4" /> GitHub
              </a>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">
            © {new Date().getFullYear()} EduAI. Built with ❤️ for students.
          </p>
        </div>
      </footer>
    </div>
  )
}
