import tommyHead from '../brand/assets/tommy-head-orange.png'
import { averageScore } from '../game/stats.ts'
import type { StatsData } from '../game/stats.ts'
import type { DailyResult, StreakData } from '../game/daily.ts'

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.06Z" />
    </svg>
  )
}

export interface HomeScreenProps {
  todayResult: DailyResult | null
  dailyStreak: StreakData
  stats: StatsData
  unlockedCount: number
  totalAchievementCount: number
  onPlayFreePlay: () => void
  onPlayDaily: () => void
  onOpenStats: () => void
  onOpenAchievements: () => void
  onOpenLeaderboard: () => void
  onOpenHowToPlay: () => void
  onOpenSettings: () => void
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function HomeScreen({
  todayResult,
  dailyStreak,
  stats,
  unlockedCount,
  totalAchievementCount,
  onPlayFreePlay,
  onPlayDaily,
  onOpenStats,
  onOpenAchievements,
  onOpenLeaderboard,
  onOpenHowToPlay,
  onOpenSettings,
}: HomeScreenProps) {
  const played = todayResult !== null
  const avg = averageScore(stats)

  return (
    <div className="home-screen">
      <div className="home-screen__header">
        <div className="header__brand" aria-hidden="true">
          <span className="brand-badge">
            <img src={tommyHead} alt="" className="brand-badge__img" />
          </span>
          <span className="brand-wordmark">
            <span className="brand-wordmark__symbol">~/</span>
            <span className="brand-wordmark__name">anniethmetic</span>
          </span>
        </div>
        <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
          <GearIcon />
        </button>
      </div>

      <h1 className="home-screen__title">Anniethmetic</h1>
      <p className="home-screen__subtitle">Six numbers, one target. Get as close as you can, Countdown-style.</p>

      <button type="button" className="btn btn--primary home-screen__play" onClick={onPlayFreePlay}>
        Play free play
      </button>

      <div className="home-daily-card">
        <div className="home-daily-card__row">
          <span className="home-daily-card__eyebrow">Daily challenge</span>
          <span className={played ? 'home-daily-card__badge home-daily-card__badge--done' : 'home-daily-card__badge'}>
            {played ? 'Done' : 'New'}
          </span>
        </div>
        <p className="home-daily-card__desc">
          {played && todayResult
            ? `Today: ${todayResult.score} pts in ${pluralize(todayResult.stepCount, 'step')}`
            : 'Same puzzle for everyone today. Come back tomorrow for a new one.'}
        </p>
        <button
          type="button"
          className={played ? 'btn btn--secondary home-daily-card__button' : 'btn btn--primary home-daily-card__button'}
          onClick={played ? undefined : onPlayDaily}
          disabled={played}
        >
          {played ? 'Played — nice one' : "Play today's puzzle"}
        </button>
        <button type="button" className="home-daily-card__leaderboard-link" onClick={onOpenLeaderboard}>
          See today's leaderboard →
        </button>
      </div>

      <div className="home-stats-row">
        <div className="home-stat-card">
          <p className="home-stat-card__label">avg score</p>
          <p className="home-stat-card__value">{avg === null ? '—' : avg.toFixed(1)}</p>
        </div>
        <div className="home-stat-card">
          <p className="home-stat-card__label">day streak</p>
          <p className="home-stat-card__value">{dailyStreak.count}</p>
        </div>
      </div>

      <button type="button" className="home-screen__see-stats" onClick={onOpenStats}>
        See all stats →
      </button>
      <button type="button" className="home-screen__see-stats" onClick={onOpenAchievements}>
        🏆 {unlockedCount}/{totalAchievementCount} achievements
      </button>
      <button type="button" className="home-screen__see-stats" onClick={onOpenHowToPlay}>
        How to play
      </button>
    </div>
  )
}
