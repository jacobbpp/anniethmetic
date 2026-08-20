import { useCallback, useState } from 'react'
import { API_BASE } from '../api.ts'

const NAME_KEY = 'anniethmetic-leaderboard-name'
const DEVICE_ID_KEY = 'anniethmetic-device-id'

export interface LeaderboardEntry {
  id: number
  name: string
  target: number
  finalValue: number | null
  score: number
  stepCount: number
  durationMs: number
}

export interface StreakEntry {
  name: string
  streakCount: number
}

interface CheckResponse {
  qualifies?: boolean
}

interface DailyLeaderboardResponse {
  entries?: LeaderboardEntry[]
}

interface StreakLeaderboardResponse {
  entries?: StreakEntry[]
}

// A random id for keying this device's daily/streak submissions — arcade
// names collide across devices, so the display name alone can't safely
// identify "this player" the way it can for an append-only scores table.
// Never shown anywhere and carries no other identity.
export function getOrCreateDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    window.localStorage.setItem(DEVICE_ID_KEY, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== 'object') return false
  const { id, name, target, finalValue, score, stepCount, durationMs } = value as Record<string, unknown>
  return (
    typeof id === 'number' &&
    typeof name === 'string' &&
    typeof target === 'number' &&
    (finalValue === null || typeof finalValue === 'number') &&
    typeof score === 'number' &&
    typeof stepCount === 'number' &&
    typeof durationMs === 'number'
  )
}

function isStreakEntry(value: unknown): value is StreakEntry {
  if (!value || typeof value !== 'object') return false
  const { name, streakCount } = value as Record<string, unknown>
  return typeof name === 'string' && typeof streakCount === 'number'
}

// Backs the daily and streak leaderboards: which name this device is
// remembered under, checking whether a just-finished score is worth
// prompting a name for, submitting it, and reading the leaderboard back.
export function useLeaderboard() {
  const [name, setName] = useState<string>(() => {
    try {
      return window.localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })

  const checkDailyQualifies = useCallback(async (date: string, score: number): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/daily-scores/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, score }),
      })
      if (!response.ok) return false
      const data = (await response.json()) as CheckResponse
      return data.qualifies === true
    } catch {
      return false
    }
  }, [])

  const submitDailyScore = useCallback(
    (
      date: string,
      playerName: string,
      target: number,
      finalValue: number | null,
      score: number,
      stepCount: number,
      durationMs: number,
    ) => {
      try {
        window.localStorage.setItem(NAME_KEY, playerName)
      } catch {
        // storage unavailable; the name just won't be remembered next time
      }
      setName(playerName)
      fetch(`${API_BASE}/daily-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // deviceId is sent purely so the server can rate limit per player
        // rather than per household; it is never stored against the score.
        body: JSON.stringify({
          date,
          name: playerName,
          target,
          finalValue,
          score,
          stepCount,
          durationMs,
          deviceId: getOrCreateDeviceId(),
        }),
      }).catch(() => {
        // Best-effort — a failed submission never blocks closing the result.
      })
    },
    [],
  )

  const fetchDailyLeaderboard = useCallback(async (date: string): Promise<LeaderboardEntry[]> => {
    try {
      const response = await fetch(`${API_BASE}/daily-scores/leaderboard?date=${date}`)
      if (!response.ok) return []
      const data = (await response.json()) as DailyLeaderboardResponse
      return Array.isArray(data.entries) ? data.entries.filter(isLeaderboardEntry) : []
    } catch {
      return []
    }
  }, [])

  // Silently keeps this device's row on the streak leaderboard current.
  // Takes the name explicitly rather than reading it back from this hook's
  // own `name` state — a caller that just chose a name via submitDailyScore
  // and immediately calls this in the same handler would otherwise read a
  // stale (pre-update) closure over `name` and skip the submission.
  const submitStreak = useCallback((playerName: string, streakCount: number, lastPlayedDate: string) => {
    if (!playerName) return
    fetch(`${API_BASE}/streaks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getOrCreateDeviceId(), name: playerName, streakCount, lastPlayedDate }),
    }).catch(() => {
      // Best-effort — a failed submission just means this device's streak
      // rank goes stale until the next day it's played.
    })
  }, [])

  const fetchStreakLeaderboard = useCallback(async (today: string): Promise<StreakEntry[]> => {
    try {
      const response = await fetch(`${API_BASE}/streaks/leaderboard?today=${today}`)
      if (!response.ok) return []
      const data = (await response.json()) as StreakLeaderboardResponse
      return Array.isArray(data.entries) ? data.entries.filter(isStreakEntry) : []
    } catch {
      return []
    }
  }, [])

  return {
    name,
    checkDailyQualifies,
    submitDailyScore,
    fetchDailyLeaderboard,
    submitStreak,
    fetchStreakLeaderboard,
  }
}
