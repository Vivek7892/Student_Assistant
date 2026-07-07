import { motion } from 'framer-motion'
import { cn, colorMap } from '../../lib/utils'

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glass?: boolean
}
export function Card({ className, hover, glass, children, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: '0 16px 48px -12px oklch(55% 0.26 290 / 0.18)' } : undefined}
      transition={{ duration: 0.2 }}
      className={cn(
        glass ? 'glass' : 'bg-[var(--surface)] border border-[var(--border)]',
        'rounded-2xl',
        hover && 'cursor-pointer',
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps { color?: string; children: React.ReactNode; className?: string }
export function Badge({ color = 'primary', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', colorMap[color]?.soft, className)}>
      {children}
    </span>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}
export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  const variants = {
    primary:   'bg-primary-500 text-white hover:bg-primary-600 shadow-glass active:scale-95',
    secondary: 'bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border)] hover:bg-[var(--surface)] active:scale-95',
    ghost:     'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] active:scale-95',
    gradient:  'bg-gradient-primary text-white shadow-glass hover:shadow-lift active:scale-95',
    outline:   'border border-[var(--border)] text-[var(--text-1)] hover:bg-[var(--surface-2)] active:scale-95',
  }
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(base, sizes[size], variants[variant], className)}
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}

// ── ProgressRing ──────────────────────────────────────────────────────────────
interface ProgressRingProps { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }
export function ProgressRing({ value, size = 56, stroke = 5, color = 'oklch(55% 0.26 290)', children }: ProgressRingProps) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="progress-ring-circle"
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}
export function Input({ icon, className, ...props }: InputProps) {
  return (
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]">{icon}</span>}
      <input
        className={cn(
          'w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)]',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all',
          icon && 'pl-9',
          className
        )}
        {...props}
      />
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ src, name, size = 8 }: { src?: string; name: string; size?: number }) {
  return src
    ? <img src={src} alt={name} className={cn('rounded-full object-cover', `w-${size} h-${size}`)} />
    : <div className={cn('rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold', `w-${size} h-${size}`)}>
        {name[0]}
      </div>
}
