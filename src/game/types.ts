export const LARGE_NUMBERS = [25, 50, 75, 100] as const
export const SMALL_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export const MAX_LARGE_NUMBERS = 2
export const TILE_COUNT = 6
export const TARGET_MIN = 101
export const TARGET_MAX = 999

export type Operator = '+' | '−' | '×' | '÷'

export type GameStatus = 'playing' | 'locked'

export interface Tile {
  id: number
  value: number
  derived: boolean
}

export interface MergeRecord {
  a: Tile
  op: Operator
  b: Tile
  result: Tile
}

export interface GameState {
  status: GameStatus
  pool: Tile[]
  target: number
  history: MergeRecord[]
  selectedId: number | null
  pendingOp: Operator | null
  nextTileId: number
  finalValue: number | null
}

// Shallow structural guard for hydrating a persisted GameState (e.g. from
// localStorage) — just enough to trust the shape before using it, not a
// full schema check.
export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<GameState>
  return (
    typeof candidate.status === 'string' &&
    Array.isArray(candidate.pool) &&
    typeof candidate.target === 'number' &&
    Array.isArray(candidate.history) &&
    typeof candidate.nextTileId === 'number'
  )
}
