import { useEffect } from 'react'
import type { Achievement } from '../game/achievements.ts'

const AUTO_DISMISS_MS = 3500

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8M12 17v4M17 4H7v5a5 5 0 0 0 10 0V4Z" />
      <path d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
    </svg>
  )
}

export interface AchievementToastProps {
  achievement: Achievement
  onDismiss: () => void
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  useEffect(() => {
    const timeout = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timeout)
  }, [achievement, onDismiss])

  return (
    <div className="achievement-toast" onClick={onDismiss} role="button" tabIndex={0}>
      <span className="achievement-toast__icon">
        <TrophyIcon />
      </span>
      <span className="achievement-toast__text">
        <span className="achievement-toast__eyebrow">Achievement unlocked</span>
        <span className="achievement-toast__title">{achievement.title}</span>
      </span>
    </div>
  )
}
