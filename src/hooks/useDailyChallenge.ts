import { useCallback, useState } from 'react'
import { createEmptyStreak, recordDailyStreak } from '../game/daily.ts'
import type { DailyResult, StreakData } from '../game/daily.ts'

const RESULT_KEY = 'anniethmetic-daily-result'
const STREAK_KEY = 'anniethmetic-daily-streak'
const HISTORY_KEY = 'anniethmetic-daily-history'
const HISTORY_LIMIT = 30

function readTodayResult(today: string): DailyResult | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(RESULT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DailyResult
    // A persisted result is only trusted if it's actually for today — one
    // left over from a previous day is treated as stale/absent.
    return parsed.date === today ? parsed : null
  } catch {
    return null
  }
}

function writeTodayResult(result: DailyResult): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RESULT_KEY, JSON.stringify(result))
  } catch {
    // storage unavailable; today's result just won't persist across reloads
  }
}

function readStreak(): StreakData {
  if (typeof window === 'undefined') return createEmptyStreak()
  try {
    const raw = window.localStorage.getItem(STREAK_KEY)
    if (!raw) return createEmptyStreak()
    return JSON.parse(raw) as StreakData
  } catch {
    return createEmptyStreak()
  }
}

function writeStreak(streak: StreakData): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STREAK_KEY, JSON.stringify(streak))
  } catch {
    // storage unavailable; the streak just won't persist across reloads
  }
}

function readHistory(): DailyResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as DailyResult[]
  } catch {
    return []
  }
}

function writeHistory(history: DailyResult[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // storage unavailable; history just won't persist across reloads
  }
}

// Prepends the newest result, de-duping by date (re-recording today's result
// replaces its previous entry instead of appearing twice), then trims to
// HISTORY_LIMIT so the list never grows unbounded.
function pushHistory(history: DailyResult[], result: DailyResult): DailyResult[] {
  const deduped = history.filter(r => r.date !== result.date)
  return [result, ...deduped].slice(0, HISTORY_LIMIT)
}

export interface UseDailyChallengeResult {
  todayResult: DailyResult | null
  streak: StreakData
  history: DailyResult[]
  recordDailyResult: (result: Omit<DailyResult, 'date'>) => void
}

// `today` must be a value the caller computed once per session (e.g. via
// getLocalDateString() at app start) and not something this hook recomputes
// itself with `new Date()` — otherwise a real midnight rollover mid-session
// could make this hook disagree with the rest of the UI about what day it is.
export function useDailyChallenge(today: string): UseDailyChallengeResult {
  const [todayResult, setTodayResult] = useState<DailyResult | null>(() => readTodayResult(today))
  const [streak, setStreak] = useState<StreakData>(readStreak)
  const [history, setHistory] = useState<DailyResult[]>(readHistory)

  const recordDailyResult = useCallback(
    (result: Omit<DailyResult, 'date'>) => {
      const stamped: DailyResult = { ...result, date: today }

      setTodayResult(stamped)
      writeTodayResult(stamped)

      setStreak(prev => {
        const next = recordDailyStreak(prev, today)
        writeStreak(next)
        return next
      })

      setHistory(prev => {
        const next = pushHistory(prev, stamped)
        writeHistory(next)
        return next
      })
    },
    [today],
  )

  return { todayResult, streak, history, recordDailyResult }
}
