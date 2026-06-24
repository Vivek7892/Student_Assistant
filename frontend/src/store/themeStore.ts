import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Theme } from '@/types'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme })
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        if (theme === 'system') {
          const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.add(systemDark ? 'dark' : 'light')
        } else {
          root.classList.add(theme)
        }
      },
    }),
    { name: 'theme-storage' }
  )
)
