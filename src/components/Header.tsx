import { BrandMark } from './BrandMark.tsx'
import { ChartIcon, GearIcon, LeaderboardIcon, TrophyIcon } from './icons.tsx'

interface HeaderProps {
  onOpenHome: () => void
  onOpenAchievements: () => void
  onOpenStats: () => void
  onOpenLeaderboard: () => void
  onOpenSettings: () => void
  hasNewAchievement: boolean
}

export function Header({
  onOpenHome,
  onOpenAchievements,
  onOpenStats,
  onOpenLeaderboard,
  onOpenSettings,
  hasNewAchievement,
}: HeaderProps) {
  return (
    <div className="header">
      <div className="header__row">
        <button type="button" className="header__brand" onClick={onOpenHome} aria-label="Home">
          <BrandMark />
        </button>
        <div className="header__actions">
          <button
            type="button"
            className={hasNewAchievement ? 'icon-btn icon-btn--dot' : 'icon-btn'}
            onClick={onOpenAchievements}
            aria-label="Achievements"
          >
            <TrophyIcon />
          </button>
          <button type="button" className="icon-btn" onClick={onOpenStats} aria-label="Stats">
            <ChartIcon />
          </button>
          <button type="button" className="icon-btn" onClick={onOpenLeaderboard} aria-label="Leaderboard">
            <LeaderboardIcon />
          </button>
          <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
            <GearIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
