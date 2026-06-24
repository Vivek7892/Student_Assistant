import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Brain, Github, Chrome } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useRegister } from '@/api/auth'

const schema = z.object({
  first_name: z.string().min(2, 'Required'),
  last_name: z.string().min(2, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  confirm_password: z.string(),
  role: z.enum(['student', 'teacher']),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student' },
  })
  const { mutate: signup, isPending } = useRegister()
  const role = watch('role')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg gradient-text">EduAI</span>
        </Link>

        <div className="mb-6">
          <h2 className="text-2xl font-bold">Create your account</h2>
          <p className="text-muted-foreground mt-1">Start your AI-powered learning journey</p>
        </div>

        {/* Role toggle */}
        <div className="flex bg-muted rounded-xl p-1 mb-6">
          {['student', 'teacher'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setValue('role', r as 'student' | 'teacher')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${role === r ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* OAuth */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <a href="/api/auth/social/google/" className="flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-accent transition-all">
            <Chrome className="h-4 w-4" /> Google
          </a>
          <a href="/api/auth/social/github/" className="flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-accent transition-all">
            <Github className="h-4 w-4" /> GitHub
          </a>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs text-muted-foreground">
            <span className="bg-background px-3">or with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => signup(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" placeholder="John" icon={<User className="h-4 w-4" />} error={errors.first_name?.message} {...register('first_name')} />
            <Input label="Last Name" placeholder="Doe" error={errors.last_name?.message} {...register('last_name')} />
          </div>
          <Input label="Email" type="email" placeholder="you@example.com" icon={<Mail className="h-4 w-4" />} error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" placeholder="Min. 8 characters" icon={<Lock className="h-4 w-4" />} error={errors.password?.message} {...register('password')} />
          <Input label="Confirm Password" type="password" placeholder="Repeat password" icon={<Lock className="h-4 w-4" />} error={errors.confirm_password?.message} {...register('confirm_password')} />

          <Button type="submit" className="w-full" loading={isPending}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
