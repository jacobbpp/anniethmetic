import { ACHIEVEMENTS, countUnlocked } from '../game/achievements.ts'
import { CheckIcon, LockedIcon } from './icons.tsx'

export interface AchievementsScreenProps {
  unlockedAt: Record<string, number>
  onClose: () => void
}

export function AchievementsScreen({ unlockedAt, onClose }: AchievementsScreenProps) {
  return (
    <div className="overlay">
      <div className="overlay__card">
        <h2 className="overlay__title">Achievements</h2>
        <p className="overlay__subtitle">
          {countUnlocked(unlockedAt)} / {ACHIEVEMENTS.length} unlocked
        </p>
        <div className="achievements-list" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {ACHIEVEMENTS.map(achievement => {
            const unlocked = achievement.id in unlockedAt
            return (
              <div
                key={achievement.id}
                className={unlocked ? 'achievement-row achievement-row--unlocked' : 'achievement-row achievement-row--locked'}
              >
                <span className="achievement-row__icon">{unlocked ? <CheckIcon /> : <LockedIcon />}</span>
                <span className="achievement-row__text">
                  <span className="achievement-row__title">{achievement.title}</span>
                  <span className="achievement-row__desc">{achievement.description}</span>
                </span>
              </div>
            )
          })}
        </div>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
