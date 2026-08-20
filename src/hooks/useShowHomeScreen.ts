import { useCallback, useState } from 'react'

const STORAGE_KEY = 'anniethmetic-show-home-screen'

function readShowHomeScreen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    // Never chosen yet defaults to showing the home screen — distinct from
    // having explicitly turned it off.
    return raw === null ? true : raw === '1'
  } catch {
    return true
  }
}

function writeShowHomeScreen(value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // storage unavailable; the toggle just won't persist across sessions
  }
}

export function useShowHomeScreen(): { showHomeScreen: boolean; toggleShowHomeScreen: () => void } {
  const [showHomeScreen, setShowHomeScreen] = useState(readShowHomeScreen)

  const toggleShowHomeScreen = useCallback(() => {
    setShowHomeScreen(prev => {
      const next = !prev
      writeShowHomeScreen(next)
      return next
    })
  }, [])

  return { showHomeScreen, toggleShowHomeScreen }
}
