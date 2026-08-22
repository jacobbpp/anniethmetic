// scoreDistribution[i] counts games that scored SCORE_BANDS[i].
export const SCORE_BANDS = [10, 7, 5, 0] as const

export interface StatsData {
  totalGames: number
  totalScore: number
  scoreDistribution: number[] // length 4, indexed per SCORE_BANDS
  currentWinStreak: number
  bestWinStreak: number
  dailyGames: number // how many of totalGames were daily-challenge completions
}

export function createEmptyStats(): StatsData {
  return {
    totalGames: 0,
    totalScore: 0,
    scoreDistribution: [0, 0, 0, 0],
    currentWinStreak: 0,
    bestWinStreak: 0,
    dailyGames: 0,
  }
}

// Any nonzero score (10, 7, or 5) counts as a "win" for streak purposes — a
// 0 is the only true miss. Immutable: never mutates the input stats object.
export function recordGame(stats: StatsData, score: number, isDaily: boolean): StatsData {
  const scoreDistribution = [...stats.scoreDistribution]
  const bandIndex = SCORE_BANDS.indexOf(score as (typeof SCORE_BANDS)[number])
  if (bandIndex !== -1) scoreDistribution[bandIndex] += 1

  const isWin = score > 0
  const currentWinStreak = isWin ? stats.currentWinStreak + 1 : 0

  return {
    totalGames: stats.totalGames + 1,
    totalScore: stats.totalScore + score,
    scoreDistribution,
    currentWinStreak,
    bestWinStreak: Math.max(stats.bestWinStreak, currentWinStreak),
    dailyGames: stats.dailyGames + (isDaily ? 1 : 0),
  }
}

export function freePlayGamesCount(stats: StatsData): number {
  return stats.totalGames - stats.dailyGames
}

export function averageScore(stats: StatsData): number | null {
  if (stats.totalGames === 0) return null
  return stats.totalScore / stats.totalGames
}

export function scoreBandCount(stats: StatsData, band: 10 | 7 | 5 | 0): number {
  const bandIndex = SCORE_BANDS.indexOf(band)
  return bandIndex === -1 ? 0 : stats.scoreDistribution[bandIndex]
}

export function winRatePercent(stats: StatsData): number | null {
  if (stats.totalGames === 0) return null
  const wins = stats.totalGames - scoreBandCount(stats, 0)
  return Math.round((wins / stats.totalGames) * 100)
}

export function hasPlayedAnyGames(stats: StatsData): boolean {
  return stats.totalGames > 0
}
