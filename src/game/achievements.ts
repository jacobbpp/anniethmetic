import { scoreBandCount } from './stats.ts'
import type { StatsData } from './stats.ts'
import type { StreakData } from './daily.ts'

export interface AchievementContext {
  stats: StatsData
  dailyStreak: StreakData
  fastestDailySolveMs: number | null
}

export interface Achievement {
  id: string
  title: string
  description: string
  isUnlocked: (ctx: AchievementContext) => boolean
}

// Not yet backed by real playtesting data — this is a placeholder starting
// point (roughly half of the optional classic 30-second clock) and should
// be re-tuned once there's a real distribution of solve times to look at.
export const FAST_SOLVE_THRESHOLD_MS = 15_000

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-perfect',
    title: 'Onya!',
    description: 'Hit the target exactly for the first time.',
    isUnlocked: ({ stats }) => scoreBandCount(stats, 10) >= 1,
  },
  {
    id: 'games-10',
    title: 'Getting your eye in',
    description: 'Play 10 games.',
    isUnlocked: ({ stats }) => stats.totalGames >= 10,
  },
  {
    id: 'games-50',
    title: 'Old hand',
    description: 'Play 50 games.',
    isUnlocked: ({ stats }) => stats.totalGames >= 50,
  },
  {
    id: 'games-100',
    title: 'Numbers tragic',
    description: 'Play 100 games.',
    isUnlocked: ({ stats }) => stats.totalGames >= 100,
  },
  {
    id: 'win-streak-3',
    title: 'On a roll',
    description: 'Win 3 games in a row.',
    isUnlocked: ({ stats }) => stats.bestWinStreak >= 3,
  },
  {
    id: 'win-streak-5',
    title: 'Ripper run',
    description: 'Win 5 games in a row.',
    isUnlocked: ({ stats }) => stats.bestWinStreak >= 5,
  },
  {
    id: 'win-streak-10',
    title: 'Absolute weapon',
    description: 'Win 10 games in a row.',
    isUnlocked: ({ stats }) => stats.bestWinStreak >= 10,
  },
  {
    id: 'daily-streak-7',
    title: "She'll be right, every day",
    description: 'Reach a 7-day daily streak.',
    isUnlocked: ({ dailyStreak }) => dailyStreak.bestStreak >= 7,
  },
  {
    id: 'fast-solve',
    title: 'Quick as a flash',
    description: `Lock in a daily solve in under ${FAST_SOLVE_THRESHOLD_MS / 1000} seconds.`,
    isUnlocked: ({ fastestDailySolveMs }) =>
      fastestDailySolveMs !== null && fastestDailySolveMs < FAST_SOLVE_THRESHOLD_MS,
  },
]

export function unlockedAchievementIds(ctx: AchievementContext): string[] {
  return ACHIEVEMENTS.filter(a => a.isUnlocked(ctx)).map(a => a.id)
}

// The persisted unlock record is append-only and can outlive the
// achievements list across app versions — count only ids that still exist
// in the current ACHIEVEMENTS list, so a stale/renamed id in an old save
// can never inflate the count past ACHIEVEMENTS.length.
export function countUnlocked(unlockedAt: Record<string, number>): number {
  return ACHIEVEMENTS.filter(a => a.id in unlockedAt).length
}
