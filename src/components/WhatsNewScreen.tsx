import type { ChangelogEntry } from '../game/changelog.ts'
import { formatDateLabel } from '../game/daily.ts'

export interface WhatsNewScreenProps {
  entries: ChangelogEntry[]
  onClose: () => void
}

export function WhatsNewScreen({ entries, onClose }: WhatsNewScreenProps) {
  return (
    <div className="overlay">
      <div className="overlay__card whats-new">
        <h2 className="overlay__title">What's new</h2>
        <div className="whats-new__list">
          {entries.map(entry => (
            <div className="whats-new__entry" key={entry.version}>
              <div className="whats-new__entry-header">
                <span className="whats-new__version">v{entry.version}</span>
                <span className="whats-new__date">{formatDateLabel(entry.date)}</span>
              </div>
              <ul className="whats-new__highlights">
                {entry.highlights.map(highlight => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="overlay__actions">
          <button type="button" className="btn btn--primary" style={{ width: '100%' }} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
