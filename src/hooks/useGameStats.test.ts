import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGameStats } from './useGameStats.ts'

const STORAGE_KEY = 'anniethmetic-stats'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useGameStats', () => {
  it('starts from an empty StatsData when nothing is stored', () => {
    const { result } = renderHook(() => useGameStats())
    expect(result.current.stats.totalGames).toBe(0)
    expect(result.current.stats.scoreDistribution).toEqual([0, 0, 0, 0])
  })

  it('hydrates from a previously persisted record', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        totalGames: 2,
        totalScore: 17,
        scoreDistribution: [1, 1, 0, 0],
        currentWinStreak: 2,
        bestWinStreak: 2,
      }),
    )

    const { result } = renderHook(() => useGameStats())

    expect(result.current.stats.totalGames).toBe(2)
    expect(result.current.stats.totalScore).toBe(17)
  })

  it('falls back to an empty StatsData when the stored value is malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')
    const { result } = renderHook(() => useGameStats())
    expect(result.current.stats.totalGames).toBe(0)
  })

  it('recordCompletedGame updates state and persists synchronously', () => {
    const { result } = renderHook(() => useGameStats())

    act(() => {
      result.current.recordCompletedGame(10)
    })

    expect(result.current.stats.totalGames).toBe(1)
    expect(result.current.stats.totalScore).toBe(10)
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(persisted.totalGames).toBe(1)
  })

  it('keeps the in-memory update even when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const { result } = renderHook(() => useGameStats())

    expect(() => {
      act(() => {
        result.current.recordCompletedGame(10)
      })
    }).not.toThrow()

    expect(result.current.stats.totalGames).toBe(1)
  })
})
