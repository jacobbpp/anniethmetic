import { useState } from 'react'

export interface LeaderboardPromptProps {
  rememberedName: string
  onSave: (name: string) => void
  onSkip: () => void
}

export function LeaderboardPrompt({ rememberedName, onSave, onSkip }: LeaderboardPromptProps) {
  const [name, setName] = useState(rememberedName)
  const trimmed = name.trim()

  return (
    <div className="overlay">
      <div className="overlay__card">
        <h2 className="overlay__title">Top 10 today!</h2>
        <p className="overlay__subtitle">Enter a name for the leaderboard.</p>
        <input
          className="leaderboard-prompt__input"
          value={name}
          onChange={event => setName(event.target.value.toUpperCase().slice(0, 8))}
          maxLength={8}
          aria-label="Name for the leaderboard"
          autoFocus
        />
        <p className="overlay__subtitle">Up to 8 characters. Remembered for next time.</p>
        <div className="overlay__actions">
          <button type="button" className="btn btn--secondary" onClick={onSkip}>
            Skip
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onSave(trimmed)}
            disabled={trimmed.length === 0}
          >
            Save score
          </button>
        </div>
      </div>
    </div>
  )
}
