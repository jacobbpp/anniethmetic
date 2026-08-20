import { useCallback, useState } from 'react'

const STORAGE_KEY = 'anniethmetic-hard-mode'

function readHardMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeHardMode(value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // storage unavailable; the toggle just won't persist across sessions
  }
}

export function useHardMode(): { hardMode: boolean; toggleHardMode: () => void } {
  const [hardMode, setHardMode] = useState(readHardMode)

  const toggleHardMode = useCallback(() => {
    setHardMode(prev => {
      const next = !prev
      writeHardMode(next)
      return next
    })
  }, [])

  return { hardMode, toggleHardMode }
}
