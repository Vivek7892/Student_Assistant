import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const colorMap: Record<string, { bg: string; text: string; border: string; ring: string; soft: string }> = {
  primary: {
    bg:     'bg-primary-500',
    text:   'text-primary-500',
    border: 'border-primary-300',
    ring:   'ring-primary-500/30',
    soft:   'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  },
  emerald: {
    bg:     'bg-emerald-500',
    text:   'text-emerald-500',
    border: 'border-emerald-400',
    ring:   'ring-emerald-500/30',
    soft:   'bg-emerald-400/10 text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    bg:     'bg-amber-500',
    text:   'text-amber-500',
    border: 'border-amber-400',
    ring:   'ring-amber-500/30',
    soft:   'bg-amber-400/10 text-amber-600 dark:text-amber-400',
  },
  cyan: {
    bg:     'bg-cyan-500',
    text:   'text-cyan-500',
    border: 'border-cyan-400',
    ring:   'ring-cyan-500/30',
    soft:   'bg-cyan-400/10 text-cyan-600 dark:text-cyan-400',
  },
  rose: {
    bg:     'bg-rose-500',
    text:   'text-rose-500',
    border: 'border-rose-400',
    ring:   'ring-rose-500/30',
    soft:   'bg-rose-400/10 text-rose-600 dark:text-rose-400',
  },
}

export const gradientMap: Record<string, string> = {
  primary: 'bg-gradient-primary',
  emerald: 'bg-gradient-emerald',
  amber:   'bg-gradient-amber',
  cyan:    'bg-gradient-cyan',
  rose:    'bg-gradient-rose',
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
