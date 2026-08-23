export const LARGE_NUMBERS = [25, 50, 75, 100] as const
export const SMALL_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export const MAX_LARGE_NUMBERS = 2
export const TILE_COUNT = 6
export const TARGET_MIN = 101
export const TARGET_MAX = 999

export type Operator = '+' | '−' | '×' | '÷'

export type GameStatus = 'playing' | 'locked'

// The six original numbers a puzzle is dealt. Unlike the old merge model,
// these never change value or get replaced — `used` just tracks whether
// this number has already been placed into the expression.
export interface Tile {
  id: number
  value: number
  used: boolean
}

export interface NumberToken {
  type: 'number'
  // null for a value produced by collapsing a sub-expression via "=" —
  // it isn't tied to any single original tile.
  tileId: number | null
  value: number
  // Present only on a collapsed value: the tokens it was flattened from,
  // so backspacing it can restore them instead of losing them outright.
  collapsedFrom?: ExpressionToken[]
}

export interface OperatorToken {
  type: 'operator'
  op: Operator
}

export interface OpenBracketToken {
  type: 'open'
}

export interface CloseBracketToken {
  type: 'close'
}

export type ExpressionToken = NumberToken | OperatorToken | OpenBracketToken | CloseBracketToken

export interface GameState {
  status: GameStatus
  tiles: Tile[]
  target: number
  tokens: ExpressionToken[]
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
    Array.isArray(candidate.tiles) &&
    typeof candidate.target === 'number' &&
    Array.isArray(candidate.tokens)
  )
}
