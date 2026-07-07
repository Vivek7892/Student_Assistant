import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  dark: boolean
  toggle: () => void
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () => set((s) => {
        const next = !s.dark
        document.documentElement.classList.toggle('dark', next)
        return { dark: next }
      }),
    }),
    {
      name: 'studybuddy-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.dark) document.documentElement.classList.add('dark')
      },
    }
  )
)
