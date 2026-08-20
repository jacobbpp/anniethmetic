import { useCallback, useEffect, useState } from 'react'
import { createInitialState } from '../game/engine.ts'
import { isGameState, type GameState } from '../game/types.ts'

const GAME_KEY = 'anniethmetic-current-game'
const RECORDED_KEY = 'anniethmetic-current-game-recorded'

function readGame(): GameState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(GAME_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isGameState(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeGame(state: GameState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GAME_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable; the in-progress game just won't survive a reload
  }
}

function readHasRecorded(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(RECORDED_KEY) === '1'
  } catch {
    return false
  }
}

function writeHasRecorded(value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (value) window.localStorage.setItem(RECORDED_KEY, '1')
    else window.localStorage.removeItem(RECORDED_KEY)
  } catch {
    // storage unavailable
  }
}

export interface UseCurrentGameResult {
  state: GameState
  setState: (state: GameState) => void
  hasRecorded: boolean
  setHasRecorded: (value: boolean) => void
  // Bumped on every restart — a stable per-game identity for things like
  // the optional classic clock, which needs to know when to rearm.
  gameId: number
  restart: () => void
}

// Free play's own current game, persisted separately from the daily
// challenge's so switching between the two never clobbers either board.
export function useCurrentGame(): UseCurrentGameResult {
  const [state, setState] = useState<GameState>(() => readGame() ?? createInitialState())
  const [hasRecorded, setHasRecordedState] = useState(readHasRecorded)
  const [gameId, setGameId] = useState(0)

  useEffect(() => {
    writeGame(state)
  }, [state])

  const setHasRecorded = useCallback((value: boolean) => {
    setHasRecordedState(value)
    writeHasRecorded(value)
  }, [])

  const restart = useCallback(() => {
    setState(createInitialState())
    setHasRecorded(false)
    setGameId(id => id + 1)
  }, [setHasRecorded])

  return { state, setState, hasRecorded, setHasRecorded, gameId, restart }
}
