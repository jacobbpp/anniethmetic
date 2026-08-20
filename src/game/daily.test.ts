import { describe, expect, it } from 'vitest'
import {
  addDays,
  averageSolveTimeMs,
  bestSolveTimeMs,
  createDailyGame,
  createEmptyStreak,
  createSeededRng,
  getLocalDateString,
  isStreakActive,
  recordDailyStreak,
  solvabilityBreakdown,
} from './daily.ts'
import type { DailyResult, StreakData } from './daily.ts'

function result(overrides: Partial<DailyResult> = {}): DailyResult {
  return {
    date: '2026-08-20',
    target: 500,
    finalValue: 500,
    score: 10,
    stepCount: 3,
    solveTimeMs: 60_000,
    wasSolvable: true,
    ...overrides,
  }
}

describe('getLocalDateString', () => {
  it('zero-pads single-digit months and days', () => {
    // Jan 5th: both month and day need a leading zero to hit 'YYYY-MM-DD'.
    expect(getLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('leaves double-digit months and days unpadded', () => {
    expect(getLocalDateString(new Date(2026, 10, 23))).toBe('2026-11-23')
  })
})

describe('addDays', () => {
  it('rolls forward across a month and year boundary', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
  })

  it('rolls backward across a month and year boundary', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('createSeededRng: determinism', () => {
  it('produces the identical sequence from the same seed', () => {
    const a = createSeededRng('2026-08-20')
    const b = createSeededRng('2026-08-20')
    const drawsA = Array.from({ length: 10 }, () => a())
    const drawsB = Array.from({ length: 10 }, () => b())
    expect(drawsA).toEqual(drawsB)
  })

  it('produces a different sequence from a different seed', () => {
    const a = createSeededRng('2026-08-20')
    const b = createSeededRng('2026-08-21')
    const drawsA = Array.from({ length: 10 }, () => a())
    const drawsB = Array.from({ length: 10 }, () => b())
    expect(drawsA).not.toEqual(drawsB)
  })

  it('spreads 200 draws across well over 150 distinct values', () => {
    // Guards against a broken PRNG collapsing to a short cycle (e.g. a bad
    // seed mixing step that repeats every few draws) — a healthy mulberry32
    // stream should look nowhere near that degenerate.
    const rng = createSeededRng('spread-check')
    const draws = Array.from({ length: 200 }, () => rng())
    expect(new Set(draws).size).toBeGreaterThan(150)
  })
})

describe('createDailyGame', () => {
  it('produces the same pool and target for the same date every time', () => {
    const first = createDailyGame('2026-08-20')
    const second = createDailyGame('2026-08-20')
    expect(first.target).toBe(second.target)
    expect(first.pool.map(t => t.value)).toEqual(second.pool.map(t => t.value))
  })

  it('produces a different puzzle for a different date', () => {
    const a = createDailyGame('2026-08-20')
    const b = createDailyGame('2026-08-21')
    const same = a.target === b.target && JSON.stringify(a.pool.map(t => t.value)) === JSON.stringify(b.pool.map(t => t.value))
    expect(same).toBe(false)
  })
})

describe('createEmptyStreak', () => {
  it('starts at zero with no last-played date', () => {
    expect(createEmptyStreak()).toEqual({ count: 0, lastPlayedDate: null, bestStreak: 0 })
  })
})

describe('recordDailyStreak', () => {
  it('is a no-op, returning the identical reference, when replaying the same day', () => {
    const streak: StreakData = { count: 3, lastPlayedDate: '2026-08-20', bestStreak: 5 }
    expect(recordDailyStreak(streak, '2026-08-20')).toBe(streak)
  })

  it('increments the count when the last played day was yesterday', () => {
    const streak: StreakData = { count: 3, lastPlayedDate: '2026-08-19', bestStreak: 5 }
    const next = recordDailyStreak(streak, '2026-08-20')
    expect(next).toEqual({ count: 4, lastPlayedDate: '2026-08-20', bestStreak: 5 })
  })

  it('resets the count to 1, with no separate "broken" flag, after a missed day', () => {
    const streak: StreakData = { count: 6, lastPlayedDate: '2026-08-10', bestStreak: 6 }
    const next = recordDailyStreak(streak, '2026-08-20')
    expect(next).toEqual({ count: 1, lastPlayedDate: '2026-08-20', bestStreak: 6 })
  })

  it('starts a fresh streak at 1 from an empty streak', () => {
    const next = recordDailyStreak(createEmptyStreak(), '2026-08-20')
    expect(next).toEqual({ count: 1, lastPlayedDate: '2026-08-20', bestStreak: 1 })
  })

  it('best streak survives a reset and only ever grows via Math.max', () => {
    let streak = createEmptyStreak()
    streak = recordDailyStreak(streak, '2026-08-01') // count 1, best 1
    streak = recordDailyStreak(streak, '2026-08-02') // count 2, best 2
    streak = recordDailyStreak(streak, '2026-08-03') // count 3, best 3
    expect(streak.bestStreak).toBe(3)

    // Missed several days: count resets to 1, but bestStreak of 3 must survive.
    streak = recordDailyStreak(streak, '2026-08-10')
    expect(streak).toEqual({ count: 1, lastPlayedDate: '2026-08-10', bestStreak: 3 })

    // Climbing back up to only 2 in a row must not disturb the surviving best of 3.
    streak = recordDailyStreak(streak, '2026-08-11')
    expect(streak.bestStreak).toBe(3)
  })
})

describe('isStreakActive', () => {
  it('is true when the last played date is today', () => {
    const streak: StreakData = { count: 2, lastPlayedDate: '2026-08-20', bestStreak: 2 }
    expect(isStreakActive(streak, '2026-08-20')).toBe(true)
  })

  it('is true when the last played date is yesterday but not yet today', () => {
    const streak: StreakData = { count: 2, lastPlayedDate: '2026-08-19', bestStreak: 2 }
    expect(isStreakActive(streak, '2026-08-20')).toBe(true)
  })

  it('is false when the last played date is two days ago', () => {
    const streak: StreakData = { count: 2, lastPlayedDate: '2026-08-18', bestStreak: 2 }
    expect(isStreakActive(streak, '2026-08-20')).toBe(false)
  })

  it('is false when nothing has ever been played', () => {
    expect(isStreakActive(createEmptyStreak(), '2026-08-20')).toBe(false)
  })
})

describe('averageSolveTimeMs', () => {
  it('averages only the entries with a recorded solve time', () => {
    const history = [
      result({ solveTimeMs: 10_000 }),
      result({ solveTimeMs: null }),
      result({ solveTimeMs: 30_000 }),
    ]
    expect(averageSolveTimeMs(history)).toBe(20_000)
  })

  it('returns null for an empty history', () => {
    expect(averageSolveTimeMs([])).toBeNull()
  })

  it('returns null when every entry has a null solve time', () => {
    expect(averageSolveTimeMs([result({ solveTimeMs: null }), result({ solveTimeMs: null })])).toBeNull()
  })
})

describe('bestSolveTimeMs', () => {
  it('takes the minimum across entries with a recorded solve time', () => {
    const history = [result({ solveTimeMs: 45_000 }), result({ solveTimeMs: null }), result({ solveTimeMs: 12_000 })]
    expect(bestSolveTimeMs(history)).toBe(12_000)
  })

  it('returns null for an empty history', () => {
    expect(bestSolveTimeMs([])).toBeNull()
  })

  it('returns null when every entry has a null solve time', () => {
    expect(bestSolveTimeMs([result({ solveTimeMs: null })])).toBeNull()
  })
})

describe('solvabilityBreakdown', () => {
  it('splits history into solvable and unsolvable days', () => {
    const history = [
      result({ wasSolvable: true, score: 10 }),
      result({ wasSolvable: true, score: 7 }),
      result({ wasSolvable: false, score: 0 }),
    ]
    expect(solvabilityBreakdown(history)).toEqual({ solvableCount: 2, unsolvableCount: 1, exactOnSolvableCount: 1 })
  })

  it('only counts an exact hit toward exactOnSolvableCount when that day was actually solvable', () => {
    // A score of 10 on an unsolvable day isn't possible in practice, but the
    // function should still only ever attribute exact hits to solvable days.
    const history = [result({ wasSolvable: false, score: 10 })]
    expect(solvabilityBreakdown(history).exactOnSolvableCount).toBe(0)
  })

  it('returns all zeros for an empty history', () => {
    expect(solvabilityBreakdown([])).toEqual({ solvableCount: 0, unsolvableCount: 0, exactOnSolvableCount: 0 })
  })
})
