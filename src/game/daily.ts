import { createInitialState } from './engine.ts'
import type { GameState } from './types.ts'

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return getLocalDateString(date)
}

export function formatDateLabel(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function hashStringToSeed(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return hash
}

// mulberry32: a small, fast PRNG with a 2^32 period, good enough statistical
// spread for game-tile shuffling, and — critically — bit-identical output
// across JS engines given the same seed. That determinism is the whole
// point of the daily puzzle: every player on every device gets the exact
// same six numbers and target for a given date.
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeededRng(seed: string): () => number {
  return mulberry32(hashStringToSeed(seed))
}

export function createDailyRng(dateString: string): () => number {
  return createSeededRng(dateString)
}

export function createDailyGame(dateString: string): GameState {
  return createInitialState(createDailyRng(dateString))
}

export interface StreakData {
  count: number
  lastPlayedDate: string | null
  bestStreak: number
}

export function createEmptyStreak(): StreakData {
  return { count: 0, lastPlayedDate: null, bestStreak: 0 }
}

export function isStreakActive(streak: StreakData, today: string): boolean {
  if (!streak.lastPlayedDate) return false
  return streak.lastPlayedDate === today || streak.lastPlayedDate === addDays(today, -1)
}

export function recordDailyStreak(streak: StreakData, today: string): StreakData {
  if (streak.lastPlayedDate === today) return streak
  const wasYesterday = streak.lastPlayedDate === addDays(today, -1)
  const count = wasYesterday ? streak.count + 1 : 1
  return { count, lastPlayedDate: today, bestStreak: Math.max(streak.bestStreak, count) }
}

export interface DailyResult {
  date: string
  target: number
  finalValue: number | null
  score: number
  stepCount: number
  solveTimeMs: number | null
  // Whether some merge chain could have hit the target exactly — not every
  // daily puzzle has one, same as the real show. Computed once via
  // game/solver.ts at the moment the result is recorded, not re-derived
  // here (solving is comparatively expensive; recording only happens once).
  wasSolvable: boolean
}

export function averageSolveTimeMs(history: DailyResult[]): number | null {
  const withTime = history.filter(r => r.solveTimeMs !== null) as (DailyResult & { solveTimeMs: number })[]
  if (withTime.length === 0) return null
  return withTime.reduce((sum, r) => sum + r.solveTimeMs, 0) / withTime.length
}

export function bestSolveTimeMs(history: DailyResult[]): number | null {
  const withTime = history.map(r => r.solveTimeMs).filter((t): t is number => t !== null)
  return withTime.length === 0 ? null : Math.min(...withTime)
}

export interface SolvabilityBreakdown {
  solvableCount: number
  unsolvableCount: number
  // Of the solvable days, how many the player actually landed exactly.
  exactOnSolvableCount: number
}

export function solvabilityBreakdown(history: DailyResult[]): SolvabilityBreakdown {
  const solvable = history.filter(r => r.wasSolvable)
  return {
    solvableCount: solvable.length,
    unsolvableCount: history.length - solvable.length,
    exactOnSolvableCount: solvable.filter(r => r.score === 10).length,
  }
}
