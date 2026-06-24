import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  return format(new Date(date), 'MMM dd, yyyy')
}

export function formatRelativeTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getMaterialTypeColor(type: string) {
  const colors: Record<string, string> = {
    notes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    assignment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    pyq: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    reference: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    syllabus: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }
  return colors[type] || colors.other
}

export function getDifficultyColor(difficulty: string) {
  const colors: Record<string, string> = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[difficulty] || colors.medium
}

export function truncate(str: string, length: number) {
  return str.length > length ? `${str.slice(0, length)}...` : str
}

export function getFileIcon(fileType: string) {
  const icons: Record<string, string> = {
    pdf: '📄',
    docx: '📝',
    doc: '📝',
    pptx: '📊',
    ppt: '📊',
    txt: '📃',
  }
  return icons[fileType.toLowerCase()] || '📁'
}
