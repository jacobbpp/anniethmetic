import { useCallback, useEffect, useRef, useState } from 'react'
import { ACHIEVEMENTS, unlockedAchievementIds, type Achievement } from '../game/achievements.ts'
import type { StatsData } from '../game/stats.ts'
import type { StreakData } from '../game/daily.ts'

const STORAGE_KEY = 'anniethmetic-achievements-unlocked'

function readUnlockedAt(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return {}
  }
}

function writeUnlockedAt(value: Record<string, number>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // storage unavailable; unlocks just won't persist across sessions
  }
}

export function useAchievements(
  stats: StatsData,
  dailyStreak: StreakData,
  fastestDailySolveMs: number | null,
): {
  unlockedAt: Record<string, number>
  newlyUnlocked: Achievement[]
  dismissNewlyUnlocked: () => void
} {
  const [unlockedAt, setUnlockedAt] = useState<Record<string, number>>(readUnlockedAt)
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([])

  // Kept in a ref (rather than read from the `unlockedAt` state closure) so
  // the effect below only needs to depend on the three inputs that actually
  // drive it — reading the freshest record here without re-triggering
  // itself just because it wrote that same record a moment ago. Synced in
  // its own effect (not during render) so the ref is never written outside
  // an effect/event handler.
  const unlockedAtRef = useRef(unlockedAt)
  useEffect(() => {
    unlockedAtRef.current = unlockedAt
  }, [unlockedAt])

  // True only until the first sync below has run once. That first pass
  // silently backfills any ids a returning device already qualifies for
  // (e.g. achievements shipping after the player already has a long win
  // streak on record) instead of queueing a pile of toasts for history
  // that already happened before the feature existed.
  const isFirstSync = useRef(true)

  useEffect(() => {
    const ids = unlockedAchievementIds({ stats, dailyStreak, fastestDailySolveMs })
    const freshIds = ids.filter(id => !(id in unlockedAtRef.current))
    const firstSync = isFirstSync.current
    isFirstSync.current = false
    if (freshIds.length === 0) return

    const now = Date.now()
    const next = { ...unlockedAtRef.current }
    freshIds.forEach(id => {
      next[id] = now
    })
    setUnlockedAt(next)
    writeUnlockedAt(next)

    if (!firstSync) {
      const freshAchievements = ACHIEVEMENTS.filter(a => freshIds.includes(a.id))
      setNewlyUnlocked(queue => [...queue, ...freshAchievements])
    }
  }, [stats, dailyStreak, fastestDailySolveMs])

  const dismissNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked(queue => queue.slice(1))
  }, [])

  return { unlockedAt, newlyUnlocked, dismissNewlyUnlocked }
}
