import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  FAST_SOLVE_THRESHOLD_MS,
  countUnlocked,
  unlockedAchievementIds,
  type AchievementContext,
} from './achievements.ts'
import { createEmptyStats } from './stats.ts'
import type { StatsData } from './stats.ts'
import { createEmptyStreak } from './daily.ts'
import type { StreakData } from './daily.ts'

function makeContext(
  statsOverrides: Partial<StatsData> = {},
  streakOverrides: Partial<StreakData> = {},
  fastestDailySolveMs: number | null = null,
): AchievementContext {
  return {
    stats: { ...createEmptyStats(), ...statsOverrides },
    dailyStreak: { ...createEmptyStreak(), ...streakOverrides },
    fastestDailySolveMs,
  }
}

describe('first-perfect', () => {
  it('is not unlocked when no game has ever scored a perfect 10', () => {
    const ctx = makeContext({ scoreDistribution: [0, 0, 0, 0] })
    expect(unlockedAchievementIds(ctx)).not.toContain('first-perfect')
  })

  it('unlocks the instant a single game has scored a perfect 10', () => {
    const ctx = makeContext({ scoreDistribution: [1, 0, 0, 0] })
    expect(unlockedAchievementIds(ctx)).toContain('first-perfect')
  })
})

describe('games-played milestones', () => {
  it('games-10 is not unlocked at 9 games but is at 10', () => {
    expect(unlockedAchievementIds(makeContext({ totalGames: 9 }))).not.toContain('games-10')
    expect(unlockedAchievementIds(makeContext({ totalGames: 10 }))).toContain('games-10')
  })

  it('games-50 is not unlocked at 49 games but is at 50', () => {
    expect(unlockedAchievementIds(makeContext({ totalGames: 49 }))).not.toContain('games-50')
    expect(unlockedAchievementIds(makeContext({ totalGames: 50 }))).toContain('games-50')
  })

  it('games-100 is not unlocked at 99 games but is at 100', () => {
    expect(unlockedAchievementIds(makeContext({ totalGames: 99 }))).not.toContain('games-100')
    expect(unlockedAchievementIds(makeContext({ totalGames: 100 }))).toContain('games-100')
  })
})

describe('win-streak milestones', () => {
  it('win-streak-3 is not unlocked at a best streak of 2 but is at 3', () => {
    expect(unlockedAchievementIds(makeContext({ bestWinStreak: 2 }))).not.toContain('win-streak-3')
    expect(unlockedAchievementIds(makeContext({ bestWinStreak: 3 }))).toContain('win-streak-3')
  })

  it('win-streak-5 is not unlocked at a best streak of 4 but is at 5', () => {
    expect(unlockedAchievementIds(makeContext({ bestWinStreak: 4 }))).not.toContain('win-streak-5')
    expect(unlockedAchievementIds(makeContext({ bestWinStreak: 5 }))).toContain('win-streak-5')
  })

  it('win-streak-10 is not unlocked at a best streak of 9 but is at 10', () => {
    expect(unlockedAchievementIds(makeContext({ bestWinStreak: 9 }))).not.toContain('win-streak-10')
    expect(unlockedAchievementIds(makeContext({ bestWinStreak: 10 }))).toContain('win-streak-10')
  })

  it('reads bestWinStreak rather than the in-progress currentWinStreak', () => {
    const ctx = makeContext({ bestWinStreak: 3, currentWinStreak: 0 })
    expect(unlockedAchievementIds(ctx)).toContain('win-streak-3')
  })
})

describe('daily-streak-7', () => {
  it('is not unlocked at a 6-day best streak but is at 7', () => {
    expect(unlockedAchievementIds(makeContext({}, { bestStreak: 6 }))).not.toContain('daily-streak-7')
    expect(unlockedAchievementIds(makeContext({}, { bestStreak: 7 }))).toContain('daily-streak-7')
  })
})

describe('fast-solve', () => {
  it('does not unlock when the fastest solve lands exactly on the threshold', () => {
    const ctx = makeContext({}, {}, FAST_SOLVE_THRESHOLD_MS)
    expect(unlockedAchievementIds(ctx)).not.toContain('fast-solve')
  })

  it('unlocks when the fastest solve is one millisecond under the threshold', () => {
    const ctx = makeContext({}, {}, FAST_SOLVE_THRESHOLD_MS - 1)
    expect(unlockedAchievementIds(ctx)).toContain('fast-solve')
  })

  it('does not unlock when there is no recorded daily solve time at all', () => {
    const ctx = makeContext({}, {}, null)
    expect(unlockedAchievementIds(ctx)).not.toContain('fast-solve')
  })
})

describe('unlockedAchievementIds', () => {
  it('returns matching ids in ACHIEVEMENTS declared array order, not any other order', () => {
    // Deliberately satisfies achievements scattered across the declared
    // array (positions 0, 1, 4, 7, 8) while leaving the higher tiers
    // (games-50/100, win-streak-5/10) unmet, so this also proves the
    // output isn't accidentally sorted alphabetically or by id.
    const ctx = makeContext(
      { totalGames: 10, bestWinStreak: 3, scoreDistribution: [1, 0, 0, 0] },
      { bestStreak: 7 },
      FAST_SOLVE_THRESHOLD_MS - 1,
    )
    expect(unlockedAchievementIds(ctx)).toEqual([
      'first-perfect',
      'games-10',
      'win-streak-3',
      'daily-streak-7',
      'fast-solve',
    ])
  })

  it('returns an empty array when nothing qualifies', () => {
    expect(unlockedAchievementIds(makeContext())).toEqual([])
  })
})

describe('countUnlocked', () => {
  it('counts zero for an empty unlock record', () => {
    expect(countUnlocked({})).toBe(0)
  })

  it('counts every id that is still present in the current ACHIEVEMENTS list', () => {
    const unlockedAt = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, 1_000]))
    expect(countUnlocked(unlockedAt)).toBe(ACHIEVEMENTS.length)
  })

  it('ignores a stale id that no longer exists in ACHIEVEMENTS, never exceeding the list length', () => {
    const unlockedAt = {
      ...Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, 1_000])),
      'retired-achievement-id': 1_000,
    }
    expect(countUnlocked(unlockedAt)).toBe(ACHIEVEMENTS.length)
  })

  it('counts only the known ids when the record mixes known and unknown ids', () => {
    const unlockedAt = { 'first-perfect': 1_000, 'made-up-id': 2_000 }
    expect(countUnlocked(unlockedAt)).toBe(1)
  })
})
