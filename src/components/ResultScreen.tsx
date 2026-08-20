import { bandEmojiForScore, buildDailyShareText, buildShareText, buildStreakShareText, formatElapsedTime } from '../game/share.ts'
import { ShareButton } from './ShareButton.tsx'

export interface ResultScreenProps {
  mode: 'free' | 'daily'
  target: number
  finalValue: number | null
  score: number
  stepCount: number
  elapsedMs: number
  dateLabel?: string // only present for mode === 'daily', e.g. "Aug 20"
  dailyStreakCount?: number // only present for mode === 'daily'
  onPlayAgain?: () => void // only present for mode === 'free' — starts a fresh free-play puzzle
  onClose: () => void // dismiss the overlay in either mode
}

type Band = 'win' | 'close' | 'miss'

function bandForScore(score: number): Band {
  if (score === 10) return 'win'
  if (score === 7 || score === 5) return 'close'
  return 'miss'
}

function titleForBand(band: Band): string {
  if (band === 'win') return 'Onya!'
  if (band === 'close') return "She'll be right"
  return 'No dice, mate'
}

function pluralizeStep(count: number): string {
  return `${count} step${count === 1 ? '' : 's'}`
}

export function ResultScreen({
  mode,
  target,
  finalValue,
  score,
  stepCount,
  elapsedMs,
  dateLabel,
  dailyStreakCount,
  onPlayAgain,
  onClose,
}: ResultScreenProps) {
  const band = bandForScore(score)
  const emojiRow = bandEmojiForScore(score).repeat(Math.max(stepCount, 1))
  const shareText =
    mode === 'daily'
      ? buildDailyShareText({ target, finalValue, score, stepCount, elapsedMs, dateLabel: dateLabel! })
      : buildShareText({ target, finalValue, score, stepCount, elapsedMs })

  return (
    <div className="overlay">
      <div className={`overlay__card overlay__card--${band}`}>
        <h2 className="overlay__title">{titleForBand(band)}</h2>
        <p className="overlay__score">
          {finalValue ?? '—'} vs {target}
        </p>
        <p className="overlay__subtitle">
          {score} pts · {pluralizeStep(stepCount)} · {formatElapsedTime(elapsedMs)}
        </p>
        <div className="overlay__grid">{emojiRow}</div>
        {mode === 'daily' && typeof dailyStreakCount === 'number' && dailyStreakCount > 0 && (
          <span className="pill pill--win">{buildStreakShareText(dailyStreakCount)}</span>
        )}
        <div className="overlay__actions">
          <ShareButton text={shareText} />
          {mode === 'free' ? (
            <button type="button" className="btn btn--primary" onClick={onPlayAgain}>
              Play again
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={onClose}>
              Done for today
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
