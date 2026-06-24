import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Brain, Github, Chrome } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useLogin } from '@/api/auth'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
  const { mutate: login, isPending } = useLogin()

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white" style={{
              width: Math.random() * 200 + 50,
              height: Math.random() * 200 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.3,
              transform: 'translate(-50%, -50%)',
            }} />
          ))}
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-8">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Learn smarter with AI</h1>
          <p className="text-white/80 text-lg leading-relaxed mb-10">
            Your personal AI-powered study assistant. Get instant answers, generate quizzes, and master any subject.
          </p>
          <div className="space-y-4">
            {[
              { label: 'AI-Powered Q&A', desc: 'Get answers from your study materials' },
              { label: 'Quiz Generation', desc: 'Auto-generate quizzes from documents' },
              { label: 'Multi-language', desc: 'Support for English and Kannada' },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-white/30 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
                <div>
                  <p className="font-medium">{f.label}</p>
                  <p className="text-white/70 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg gradient-text">EduAI</span>
            </Link>
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-muted-foreground mt-1">Sign in to your account to continue</p>
          </div>

          {/* OAuth buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <a href="/api/auth/social/google/" className="flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-accent transition-all">
              <Chrome className="h-4 w-4" />
              Google
            </a>
            <a href="/api/auth/social/github/" className="flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-accent transition-all">
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-background px-3">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit((d) => login(d))} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={isPending}>
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">Sign up</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
