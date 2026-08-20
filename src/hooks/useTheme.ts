import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'anniethmetic-theme'

export type Theme = 'light' | 'dark'

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // fall through to device default
  }
  // Nothing stored yet: follow the device, defaulting to dark once the
  // player makes an explicit choice it always wins from then on.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function writeTheme(value: Theme): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // storage unavailable; the choice just won't persist across sessions
  }
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      writeTheme(next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
