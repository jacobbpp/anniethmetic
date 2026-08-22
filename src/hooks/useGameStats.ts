import { useCallback, useState } from 'react'
import { createEmptyStats, recordGame, type StatsData } from '../game/stats.ts'

const STORAGE_KEY = 'anniethmetic-stats'

// Backfills fields missing from a save written before they existed, so an
// upgrade never loses history — a save from before the free/daily split was
// added just starts that count at 0 rather than failing to load.
function normalizeStats(stats: StatsData): StatsData {
  return { ...stats, dailyGames: stats.dailyGames ?? 0 }
}

function readStats(): StatsData {
  if (typeof window === 'undefined') return createEmptyStats()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyStats()
    return normalizeStats(JSON.parse(raw) as StatsData)
  } catch {
    return createEmptyStats()
  }
}

function writeStats(stats: StatsData): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — stats just won't persist across reloads.
  }
}

export function useGameStats() {
  const [stats, setStats] = useState<StatsData>(readStats)

  const recordCompletedGame = useCallback((score: number, isDaily: boolean) => {
    setStats(prev => {
      const next = recordGame(prev, score, isDaily)
      writeStats(next)
      return next
    })
  }, [])

  return { stats, recordCompletedGame }
}
