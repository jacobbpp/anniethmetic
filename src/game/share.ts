// Pure string-building for the share sheet. No clipboard or Web Share API
// code here — that lives in the ShareButton component, which is the only
// place allowed to touch browser delivery mechanisms.

export interface ShareParams {
  target: number
  finalValue: number | null
  score: number
  stepCount: number
  elapsedMs: number
}

export function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// Score-driven, not distance-driven: a 7 and a 5 both read as the same
// "close" band even though they come from different distances (<=5 and
// <=10 respectively) — the brief bands by points, not raw miss distance.
export function bandEmojiForScore(score: number): '🟩' | '🟧' | '⬛' {
  if (score === 10) return '🟩'
  if (score === 7 || score === 5) return '🟧'
  return '⬛'
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function buildHeadline(prefix: string, params: ShareParams): string {
  const { target, finalValue, score, stepCount, elapsedMs } = params
  const valueLabel = finalValue ?? '–'
  return `${prefix} · ${valueLabel} vs ${target} (${score} pts, ${pluralize(stepCount, 'step')}, ${formatElapsedTime(elapsedMs)})`
}

// Always at least one emoji: locking in an original tile with zero merges
// is still a real attempt with a real band, not a blank line.
function buildBandLine(score: number, stepCount: number): string {
  return bandEmojiForScore(score).repeat(Math.max(stepCount, 1))
}

export function buildShareText(params: ShareParams): string {
  return `${buildHeadline('tb·dev Anniethmetic', params)}\n${buildBandLine(params.score, params.stepCount)}`
}

export function buildDailyShareText(params: ShareParams & { dateLabel: string }): string {
  const headline = buildHeadline(`tb·dev Anniethmetic Daily (${params.dateLabel})`, params)
  return `${headline}\n${buildBandLine(params.score, params.stepCount)}`
}

export function buildStreakShareText(streakCount: number): string {
  return `🔥 ${streakCount} day streak on Anniethmetic Daily!`
}
