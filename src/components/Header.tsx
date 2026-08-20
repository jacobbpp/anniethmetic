import tommyHead from '../brand/assets/tommy-head-orange.png'

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  width: 18,
  height: 18,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function TrophyIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.06Z" />
    </svg>
  )
}

interface HeaderProps {
  onOpenHome: () => void
  onOpenAchievements: () => void
  onOpenStats: () => void
  onOpenSettings: () => void
  hasNewAchievement: boolean
}

export function Header({ onOpenHome, onOpenAchievements, onOpenStats, onOpenSettings, hasNewAchievement }: HeaderProps) {
  return (
    <div className="header">
      <div className="header__row">
        <button type="button" className="header__brand" onClick={onOpenHome} aria-label="Home">
          <span className="brand-badge">
            <img src={tommyHead} alt="" className="brand-badge__img" />
          </span>
          <span className="brand-wordmark">
            <span className="brand-wordmark__symbol">~/</span>
            <span className="brand-wordmark__name">anniethmetic</span>
          </span>
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
          <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
            <GearIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
