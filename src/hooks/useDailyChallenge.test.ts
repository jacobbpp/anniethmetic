import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDailyChallenge } from './useDailyChallenge.ts'
import type { DailyResult } from '../game/daily.ts'

const TODAY = '2026-08-20'

function pendingResult(overrides: Partial<Omit<DailyResult, 'date'>> = {}): Omit<DailyResult, 'date'> {
  return {
    target: 500,
    finalValue: 500,
    score: 10,
    stepCount: 3,
    solveTimeMs: 45_000,
    ...overrides,
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('useDailyChallenge: initial state', () => {
  it('starts with no result, an empty streak, and empty history when storage is empty', () => {
    const { result } = renderHook(() => useDailyChallenge(TODAY))
    expect(result.current.todayResult).toBeNull()
    expect(result.current.streak).toEqual({ count: 0, lastPlayedDate: null, bestStreak: 0 })
    expect(result.current.history).toEqual([])
  })

  it('treats a persisted result from a previous day as stale and reports it as absent', () => {
    window.localStorage.setItem(
      'anniethmetic-daily-result',
      JSON.stringify({ date: '2026-08-19', target: 500, finalValue: 500, score: 10, stepCount: 2, solveTimeMs: 1000 }),
    )
    const { result } = renderHook(() => useDailyChallenge(TODAY))
    expect(result.current.todayResult).toBeNull()
  })

  it("loads a persisted result whose date matches today", () => {
    const stored: DailyResult = { date: TODAY, target: 500, finalValue: 500, score: 10, stepCount: 2, solveTimeMs: 1000 }
    window.localStorage.setItem('anniethmetic-daily-result', JSON.stringify(stored))
    const { result } = renderHook(() => useDailyChallenge(TODAY))
    expect(result.current.todayResult).toEqual(stored)
  })
})

describe('useDailyChallenge: recordDailyResult', () => {
  it('stamps the result with today\'s date and persists it', () => {
    const { result } = renderHook(() => useDailyChallenge(TODAY))

    act(() => {
      result.current.recordDailyResult(pendingResult())
    })

    expect(result.current.todayResult).toEqual({ date: TODAY, ...pendingResult() })
    const persisted = JSON.parse(window.localStorage.getItem('anniethmetic-daily-result')!)
    expect(persisted).toEqual({ date: TODAY, ...pendingResult() })
  })

  it('updates the streak via recordDailyStreak and persists it', () => {
    window.localStorage.setItem(
      'anniethmetic-daily-streak',
      JSON.stringify({ count: 2, lastPlayedDate: '2026-08-19', bestStreak: 4 }),
    )
    const { result } = renderHook(() => useDailyChallenge(TODAY))

    act(() => {
      result.current.recordDailyResult(pendingResult())
    })

    expect(result.current.streak).toEqual({ count: 3, lastPlayedDate: TODAY, bestStreak: 4 })
    const persisted = JSON.parse(window.localStorage.getItem('anniethmetic-daily-streak')!)
    expect(persisted).toEqual({ count: 3, lastPlayedDate: TODAY, bestStreak: 4 })
  })

  it('prepends to history newest-first and persists it', () => {
    window.localStorage.setItem(
      'anniethmetic-daily-history',
      JSON.stringify([{ date: '2026-08-19', target: 400, finalValue: 400, score: 10, stepCount: 2, solveTimeMs: 2000 }]),
    )
    const { result } = renderHook(() => useDailyChallenge(TODAY))

    act(() => {
      result.current.recordDailyResult(pendingResult())
    })

    expect(result.current.history.map(r => r.date)).toEqual([TODAY, '2026-08-19'])
    const persisted = JSON.parse(window.localStorage.getItem('anniethmetic-daily-history')!)
    expect(persisted.map((r: DailyResult) => r.date)).toEqual([TODAY, '2026-08-19'])
  })

  it("de-dupes history by date, replacing today's earlier entry rather than duplicating it", () => {
    const { result } = renderHook(() => useDailyChallenge(TODAY))

    act(() => {
      result.current.recordDailyResult(pendingResult({ score: 5 }))
    })
    act(() => {
      result.current.recordDailyResult(pendingResult({ score: 10 }))
    })

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].score).toBe(10)
  })

  it('trims history to the 30-entry limit', () => {
    const seeded: DailyResult[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      target: 500,
      finalValue: 500,
      score: 10,
      stepCount: 1,
      solveTimeMs: 1000,
    }))
    window.localStorage.setItem('anniethmetic-daily-history', JSON.stringify(seeded))
    const { result } = renderHook(() => useDailyChallenge(TODAY))

    act(() => {
      result.current.recordDailyResult(pendingResult())
    })

    expect(result.current.history).toHaveLength(30)
    expect(result.current.history[0].date).toBe(TODAY)
    // The oldest seeded entry should have been pushed out to keep the cap at 30.
    expect(result.current.history.some(r => r.date === '2026-07-30')).toBe(false)
  })
})
