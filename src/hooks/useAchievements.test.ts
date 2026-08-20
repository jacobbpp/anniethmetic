import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAchievements } from './useAchievements.ts'
import { createEmptyStats } from '../game/stats.ts'
import type { StatsData } from '../game/stats.ts'
import { createEmptyStreak } from '../game/daily.ts'
import type { StreakData } from '../game/daily.ts'

const STORAGE_KEY = 'anniethmetic-achievements-unlocked'

interface Props {
  stats: StatsData
  dailyStreak: StreakData
  fastestDailySolveMs: number | null
}

function setup(initialProps: Props) {
  return renderHook(
    ({ stats, dailyStreak, fastestDailySolveMs }: Props) => useAchievements(stats, dailyStreak, fastestDailySolveMs),
    { initialProps },
  )
}

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    stats: createEmptyStats(),
    dailyStreak: createEmptyStreak(),
    fastestDailySolveMs: null,
    ...overrides,
  }
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useAchievements: hydration', () => {
  it('starts with an empty unlock record and no toasts when nothing is stored and nothing qualifies yet', () => {
    const { result } = setup(baseProps())
    expect(result.current.unlockedAt).toEqual({})
    expect(result.current.newlyUnlocked).toEqual([])
  })

  it('hydrates unlockedAt from a previously persisted record', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'first-perfect': 1_000 }))
    const { result } = setup(baseProps())
    expect(result.current.unlockedAt['first-perfect']).toBe(1_000)
  })

  it('falls back to an empty record when the stored value is malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')
    const { result } = setup(baseProps())
    expect(result.current.unlockedAt).toEqual({})
  })
})

describe('useAchievements: first-sync backfill versus live unlocks', () => {
  it('silently backfills an achievement already earned on a fresh device, without queuing a toast', () => {
    vi.spyOn(Date, 'now').mockReturnValue(5_000)
    const { result } = setup(baseProps({ stats: { ...createEmptyStats(), totalGames: 10 } }))

    expect(result.current.unlockedAt['games-10']).toBe(5_000)
    expect(result.current.newlyUnlocked).toEqual([])
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(persisted['games-10']).toBe(5_000)
  })

  it('queues a toast and timestamps the unlock for an achievement earned after the first sync has settled', () => {
    vi.spyOn(Date, 'now').mockReturnValue(9_000)
    const { result, rerender } = setup(baseProps())
    expect(result.current.newlyUnlocked).toEqual([])

    act(() => {
      rerender(baseProps({ stats: { ...createEmptyStats(), totalGames: 10 } }))
    })

    expect(result.current.unlockedAt['games-10']).toBe(9_000)
    expect(result.current.newlyUnlocked.map(a => a.id)).toEqual(['games-10'])
  })

  it('queues several simultaneously-earned achievements in ACHIEVEMENTS declared order, not id or alphabetical order', () => {
    const { result, rerender } = setup(baseProps())

    act(() => {
      rerender(
        baseProps({
          stats: { ...createEmptyStats(), totalGames: 10, bestWinStreak: 3, scoreDistribution: [1, 0, 0, 0] },
        }),
      )
    })

    expect(result.current.newlyUnlocked.map(a => a.id)).toEqual(['first-perfect', 'games-10', 'win-streak-3'])
  })

  it('never re-queues or re-timestamps an id that is already recorded as unlocked', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const { result, rerender } = setup(baseProps())
    act(() => {
      rerender(baseProps({ stats: { ...createEmptyStats(), totalGames: 10 } }))
    })
    expect(result.current.unlockedAt['games-10']).toBe(1_000)
    act(() => {
      result.current.dismissNewlyUnlocked()
    })

    vi.spyOn(Date, 'now').mockReturnValue(2_000)
    act(() => {
      rerender(baseProps({ stats: { ...createEmptyStats(), totalGames: 11 } }))
    })
    expect(result.current.unlockedAt['games-10']).toBe(1_000)
    expect(result.current.newlyUnlocked).toEqual([])
  })
})

describe('useAchievements: newlyUnlocked toast queue', () => {
  it('drains one at a time, oldest first, via dismissNewlyUnlocked', () => {
    const { result, rerender } = setup(baseProps())

    act(() => {
      rerender(baseProps({ stats: { ...createEmptyStats(), totalGames: 10, bestWinStreak: 3 } }))
    })
    expect(result.current.newlyUnlocked.map(a => a.id)).toEqual(['games-10', 'win-streak-3'])

    act(() => {
      result.current.dismissNewlyUnlocked()
    })
    expect(result.current.newlyUnlocked.map(a => a.id)).toEqual(['win-streak-3'])

    act(() => {
      result.current.dismissNewlyUnlocked()
    })
    expect(result.current.newlyUnlocked).toEqual([])
  })

  it('is a no-op when the queue is already empty', () => {
    const { result } = setup(baseProps())
    act(() => {
      result.current.dismissNewlyUnlocked()
    })
    expect(result.current.newlyUnlocked).toEqual([])
  })

  it('keeps a stable dismissNewlyUnlocked identity across renders', () => {
    const { result, rerender } = setup(baseProps())
    const first = result.current.dismissNewlyUnlocked
    rerender(baseProps())
    expect(result.current.dismissNewlyUnlocked).toBe(first)
  })
})
