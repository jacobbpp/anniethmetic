import { useEffect, useState } from 'react'
import { createDailyGame } from '../game/daily.ts'
import { isGameState, type GameState } from '../game/types.ts'

const STORAGE_KEY = 'anniethmetic-current-daily-game'

interface StoredDailyGame {
  date: string
  state: GameState
}

function isStoredDailyGame(value: unknown): value is StoredDailyGame {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredDailyGame>
  return typeof candidate.date === 'string' && isGameState(candidate.state)
}

function readStored(): StoredDailyGame | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isStoredDailyGame(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeStored(value: StoredDailyGame): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // storage unavailable; the in-progress daily game just won't survive a reload
  }
}

export interface UseCurrentDailyGameResult {
  state: GameState
  setState: (state: GameState) => void
}

// Today's in-progress daily board, persisted separately from free play's.
// A stale save from a previous date is discarded in favour of a fresh,
// deterministic puzzle for `today`.
export function useCurrentDailyGame(today: string): UseCurrentDailyGameResult {
  const [state, setState] = useState<GameState>(() => {
    const stored = readStored()
    if (stored && stored.date === today) return stored.state
    return createDailyGame(today)
  })

  useEffect(() => {
    writeStored({ date: today, state })
  }, [today, state])

  return { state, setState }
}
