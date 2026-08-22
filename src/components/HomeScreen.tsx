import { BrandMark } from './BrandMark.tsx'
import { StatCard } from './StatCard.tsx'
import { GearIcon, TrophyIcon } from './icons.tsx'
import { averageScore } from '../game/stats.ts'
import type { StatsData } from '../game/stats.ts'
import type { DailyResult, StreakData } from '../game/daily.ts'

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
          <BrandMark />
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

      <div className="tb-card home-daily-card">
        <div className="home-daily-card__row">
          <span className="tb-eyebrow">Daily challenge</span>
          <span className={played ? 'tb-pill tb-pill--muted' : 'tb-pill tb-pill--orange'}>
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
          className={played ? 'btn btn--secondary home-daily-card__button' : 'btn btn--cta home-daily-card__button'}
          onClick={played ? undefined : onPlayDaily}
          disabled={played}
        >
          {played ? 'Played, nice one' : "Play today's puzzle"}
        </button>
        <button type="button" className="home-daily-card__leaderboard-link" onClick={onOpenLeaderboard}>
          See today's leaderboard →
        </button>
      </div>

      <div className="home-stats-row">
        <StatCard label="avg score" value={avg === null ? '–' : avg.toFixed(1)} />
        <StatCard label="day streak" value={String(dailyStreak.count)} />
      </div>

      <button type="button" className="home-screen__see-stats" onClick={onOpenStats}>
        See all stats →
      </button>
      <button type="button" className="home-screen__see-stats" onClick={onOpenAchievements} aria-label="Achievements">
        <TrophyIcon /> {unlockedCount}/{totalAchievementCount} achievements
      </button>
      <button type="button" className="home-screen__see-stats" onClick={onOpenHowToPlay}>
        How to play
      </button>
    </div>
  )
}
