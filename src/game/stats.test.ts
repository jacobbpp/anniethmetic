import { describe, expect, it } from 'vitest'
import {
  averageScore,
  createEmptyStats,
  freePlayGamesCount,
  hasPlayedAnyGames,
  recordGame,
  scoreBandCount,
  winRatePercent,
} from './stats.ts'

describe('createEmptyStats', () => {
  it('starts every counter at zero with a four-slot distribution', () => {
    const stats = createEmptyStats()
    expect(stats.totalGames).toBe(0)
    expect(stats.totalScore).toBe(0)
    expect(stats.scoreDistribution).toEqual([0, 0, 0, 0])
    expect(stats.currentWinStreak).toBe(0)
    expect(stats.bestWinStreak).toBe(0)
    expect(stats.dailyGames).toBe(0)
  })
})

describe('recordGame: free play vs daily split', () => {
  it('counts a free-play game toward totalGames but not dailyGames', () => {
    const stats = recordGame(createEmptyStats(), 10, false)
    expect(stats.totalGames).toBe(1)
    expect(stats.dailyGames).toBe(0)
    expect(freePlayGamesCount(stats)).toBe(1)
  })

  it('counts a daily game toward both totalGames and dailyGames', () => {
    const stats = recordGame(createEmptyStats(), 10, true)
    expect(stats.totalGames).toBe(1)
    expect(stats.dailyGames).toBe(1)
    expect(freePlayGamesCount(stats)).toBe(0)
  })

  it('accumulates the split correctly across a mix of modes', () => {
    let stats = createEmptyStats()
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 7, true)
    stats = recordGame(stats, 0, false)
    stats = recordGame(stats, 5, true)
    expect(stats.totalGames).toBe(4)
    expect(stats.dailyGames).toBe(2)
    expect(freePlayGamesCount(stats)).toBe(2)
  })
})

describe('recordGame: score distribution', () => {
  it('lands a score of 10 in the first distribution slot', () => {
    const stats = recordGame(createEmptyStats(), 10, false)
    expect(stats.scoreDistribution).toEqual([1, 0, 0, 0])
  })

  it('lands a score of 7 in the second distribution slot', () => {
    const stats = recordGame(createEmptyStats(), 7, false)
    expect(stats.scoreDistribution).toEqual([0, 1, 0, 0])
  })

  it('lands a score of 5 in the third distribution slot', () => {
    const stats = recordGame(createEmptyStats(), 5, false)
    expect(stats.scoreDistribution).toEqual([0, 0, 1, 0])
  })

  it('lands a score of 0 in the fourth distribution slot', () => {
    const stats = recordGame(createEmptyStats(), 0, false)
    expect(stats.scoreDistribution).toEqual([0, 0, 0, 1])
  })

  it('accumulates totals and distribution counts across repeated games', () => {
    let stats = createEmptyStats()
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 5, false)
    expect(stats.totalGames).toBe(3)
    expect(stats.totalScore).toBe(25)
    expect(stats.scoreDistribution).toEqual([2, 0, 1, 0])
  })
})

describe('recordGame: immutability', () => {
  it('never mutates the input stats object', () => {
    const stats = createEmptyStats()
    const snapshot = JSON.parse(JSON.stringify(stats))
    recordGame(stats, 10, false)
    // original stats object must be byte-for-byte unchanged
    expect(stats).toEqual(snapshot)
  })

  it('clones the scoreDistribution array rather than mutating it in place', () => {
    const stats = createEmptyStats()
    const originalDistribution = stats.scoreDistribution
    const next = recordGame(stats, 10, false)
    expect(next.scoreDistribution).not.toBe(originalDistribution)
    expect(originalDistribution).toEqual([0, 0, 0, 0])
  })
})

describe('recordGame: win streaks', () => {
  it('extends currentWinStreak on any nonzero score and records a new bestWinStreak in the same call', () => {
    let stats = createEmptyStats()
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 7, false)
    stats = recordGame(stats, 5, false)
    expect(stats.currentWinStreak).toBe(3)
    expect(stats.bestWinStreak).toBe(3)
  })

  it('resets currentWinStreak to 0 on a single 0-score game but leaves bestWinStreak untouched', () => {
    let stats = createEmptyStats()
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 10, false)
    expect(stats.bestWinStreak).toBe(3)

    stats = recordGame(stats, 0, false)
    expect(stats.currentWinStreak).toBe(0)
    expect(stats.bestWinStreak).toBe(3)
  })

  it('does not lower bestWinStreak when a later streak fails to beat it', () => {
    let stats = createEmptyStats()
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 0, false)
    stats = recordGame(stats, 7, false)
    expect(stats.currentWinStreak).toBe(1)
    expect(stats.bestWinStreak).toBe(3)
  })
})

describe('averageScore', () => {
  it('returns null on an empty StatsData rather than dividing by zero', () => {
    expect(averageScore(createEmptyStats())).toBeNull()
  })

  it('averages total score across all recorded games', () => {
    let stats = createEmptyStats()
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 5, false)
    expect(averageScore(stats)).toBe(7.5)
  })
})

describe('scoreBandCount', () => {
  it('returns 0 for every band on an empty StatsData', () => {
    const stats = createEmptyStats()
    expect(scoreBandCount(stats, 10)).toBe(0)
    expect(scoreBandCount(stats, 7)).toBe(0)
    expect(scoreBandCount(stats, 5)).toBe(0)
    expect(scoreBandCount(stats, 0)).toBe(0)
  })

  it('reads the count for the matching band after some games are recorded', () => {
    let stats = createEmptyStats()
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 0, false)
    expect(scoreBandCount(stats, 10)).toBe(2)
    expect(scoreBandCount(stats, 0)).toBe(1)
    expect(scoreBandCount(stats, 7)).toBe(0)
  })
})

describe('winRatePercent', () => {
  it('returns null on an empty StatsData rather than dividing by zero', () => {
    expect(winRatePercent(createEmptyStats())).toBeNull()
  })

  it('rounds rather than truncating a repeating decimal', () => {
    // 1 win out of 3 games is 33.33...% — must round to 33, not truncate or floor differently.
    let stats = createEmptyStats()
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 0, false)
    stats = recordGame(stats, 0, false)
    expect(winRatePercent(stats)).toBe(33)
  })

  it('counts any nonzero score as a win when computing the rate', () => {
    let stats = createEmptyStats()
    stats = recordGame(stats, 10, false)
    stats = recordGame(stats, 7, false)
    stats = recordGame(stats, 5, false)
    stats = recordGame(stats, 0, false)
    expect(winRatePercent(stats)).toBe(75)
  })
})

describe('hasPlayedAnyGames', () => {
  it('is false on an empty StatsData', () => {
    expect(hasPlayedAnyGames(createEmptyStats())).toBe(false)
  })

  it('is true once at least one game has been recorded', () => {
    expect(hasPlayedAnyGames(recordGame(createEmptyStats(), 0, false))).toBe(true)
  })
})
