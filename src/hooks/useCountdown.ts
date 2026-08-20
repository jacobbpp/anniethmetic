import { useEffect, useRef, useState } from 'react'

// A nod to the show's real time pressure: once armed, ticks down from
// `seconds` and fires `onExpire` once. `resetSignal` should change whenever
// a new game begins (e.g. the game's target), so the clock rearms fresh
// rather than continuing to count down from a previous puzzle.
export function useCountdown(
  resetSignal: unknown,
  active: boolean,
  seconds: number,
  onExpire: () => void,
): { secondsLeft: number } {
  const [secondsLeft, setSecondsLeft] = useState(seconds)
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    setSecondsLeft(seconds)
    expiredRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal, seconds])

  useEffect(() => {
    if (!active || expiredRef.current) return
    if (secondsLeft <= 0) {
      expiredRef.current = true
      onExpireRef.current()
      return
    }
    const timeout = setTimeout(() => setSecondsLeft(value => value - 1), 1000)
    return () => clearTimeout(timeout)
  }, [active, secondsLeft])

  return { secondsLeft }
}
