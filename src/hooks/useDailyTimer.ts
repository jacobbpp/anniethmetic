import { useEffect, useRef, useState } from 'react'

const TICK_MS = 250

// Stopwatch for the daily puzzle's solve time.
//
// `hasStarted` should be `state.tokens.length > 0` (true from the player's
// first key press) and `isLocked` should be `state.status === 'locked'`.
export function useDailyTimer(hasStarted: boolean, isLocked: boolean): { elapsedMs: number } {
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAtRef = useRef<number | null>(null)
  const lockedAtRef = useRef<number | null>(null)
  // One-shot latch: once `hasStarted` has been true, this stays true even if
  // `hasStarted` later goes back to false (e.g. backspacing away every typed
  // token). The stopwatch must not re-arm or reset once play has begun.
  const hasStartedOnceRef = useRef(false)

  useEffect(() => {
    if (hasStarted && !hasStartedOnceRef.current) {
      hasStartedOnceRef.current = true
      startedAtRef.current = Date.now()
    }
  }, [hasStarted])

  useEffect(() => {
    if (isLocked && lockedAtRef.current === null && startedAtRef.current !== null) {
      lockedAtRef.current = Date.now()
      setElapsedMs(lockedAtRef.current - startedAtRef.current)
    }
  }, [isLocked])

  useEffect(() => {
    if (!hasStartedOnceRef.current || isLocked) return
    const interval = setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsedMs(Date.now() - startedAtRef.current)
      }
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [hasStarted, isLocked])

  return { elapsedMs }
}
