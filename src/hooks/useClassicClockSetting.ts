import { useCallback, useState } from 'react'

const STORAGE_KEY = 'anniethmetic-classic-clock'

function readClassicClock(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeClassicClock(value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // storage unavailable; the toggle just won't persist across sessions
  }
}

export function useClassicClockSetting(): { classicClock: boolean; toggleClassicClock: () => void } {
  const [classicClock, setClassicClock] = useState(readClassicClock)

  const toggleClassicClock = useCallback(() => {
    setClassicClock(prev => {
      const next = !prev
      writeClassicClock(next)
      return next
    })
  }, [])

  return { classicClock, toggleClassicClock }
}
