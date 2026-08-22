import { useEffect, useState } from 'react'
import { formatElapsedTime } from '../game/share.ts'
import type { LeaderboardEntry, StreakEntry } from '../hooks/useLeaderboard.ts'
import { ScreenHeader } from './ScreenHeader.tsx'
import { FlameIcon } from './icons.tsx'

type Mode = 'daily' | 'streaks'

export interface LeaderboardScreenProps {
  fetchDailyLeaderboard: (date: string) => Promise<LeaderboardEntry[]>
  fetchStreakLeaderboard: (today: string) => Promise<StreakEntry[]>
  today: string
  rememberedName: string
  onClose: () => void
}

export function LeaderboardScreen({
  fetchDailyLeaderboard,
  fetchStreakLeaderboard,
  today,
  rememberedName,
  onClose,
}: LeaderboardScreenProps) {
  const [mode, setMode] = useState<Mode>('daily')
  const [dailyEntries, setDailyEntries] = useState<LeaderboardEntry[] | null>(null)
  const [streakEntries, setStreakEntries] = useState<StreakEntry[] | null>(null)

  // Both fetch once on mount, in parallel, rather than re-fetching (and
  // flashing back to "Loading") every time the tab toggles.
  useEffect(() => {
    let cancelled = false
    fetchDailyLeaderboard(today).then(entries => {
      if (!cancelled) setDailyEntries(entries)
    })
    return () => {
      cancelled = true
    }
  }, [today, fetchDailyLeaderboard])

  useEffect(() => {
    let cancelled = false
    fetchStreakLeaderboard(today).then(entries => {
      if (!cancelled) setStreakEntries(entries)
    })
    return () => {
      cancelled = true
    }
  }, [today, fetchStreakLeaderboard])

  return (
    <div className="screen">
      <ScreenHeader title="Leaderboard" backLabel="Back to game" onBack={onClose} />
      <div className="screen__body">
        <div className="heatmap-toggle leaderboard-toggle">
          <button
            type="button"
            className={mode === 'daily' ? 'heatmap-toggle__option heatmap-toggle__option--active' : 'heatmap-toggle__option'}
            aria-pressed={mode === 'daily'}
            onClick={() => setMode('daily')}
          >
            Today
          </button>
          <button
            type="button"
            className={mode === 'streaks' ? 'heatmap-toggle__option heatmap-toggle__option--active' : 'heatmap-toggle__option'}
            aria-pressed={mode === 'streaks'}
            onClick={() => setMode('streaks')}
          >
            Streaks
          </button>
        </div>

        {mode === 'daily' ? (
          dailyEntries === null ? (
            <p className="screen__empty">Loading leaderboard.</p>
          ) : dailyEntries.length === 0 ? (
            <p className="screen__empty">No scores yet today. Be the first.</p>
          ) : (
            <ol className="leaderboard-list">
              {dailyEntries.map((entry, index) => {
                const isYou = entry.name === rememberedName
                return (
                  <li key={entry.id}>
                    <div className={isYou ? 'leaderboard-row leaderboard-row--you' : 'leaderboard-row'}>
                      <span className="leaderboard-row__rank">{index + 1}</span>
                      <span className="leaderboard-row__name">
                        {entry.name}
                        {isYou ? ' · you' : ''}
                      </span>
                      <span className="leaderboard-row__score">{entry.score} pts</span>
                      <span className="leaderboard-row__time">{formatElapsedTime(entry.durationMs)}</span>
                    </div>
                  </li>
                )
              })}
            </ol>
          )
        ) : streakEntries === null ? (
          <p className="screen__empty">Loading streaks.</p>
        ) : streakEntries.length === 0 ? (
          <p className="screen__empty">No active streaks yet.</p>
        ) : (
          <ol className="leaderboard-list">
            {streakEntries.map((entry, index) => {
              const isYou = entry.name === rememberedName
              return (
                <li key={`${entry.name}-${index}`}>
                  <div className={isYou ? 'leaderboard-row leaderboard-row--you' : 'leaderboard-row'}>
                    <span className="leaderboard-row__rank">{index + 1}</span>
                    <span className="leaderboard-row__name">
                      {entry.name}
                      {isYou ? ' · you' : ''}
                    </span>
                    <span className="leaderboard-row__score">
                      <FlameIcon /> {entry.streakCount}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
