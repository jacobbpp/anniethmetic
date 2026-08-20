import {
  LARGE_NUMBERS,
  MAX_LARGE_NUMBERS,
  SMALL_NUMBERS,
  TARGET_MAX,
  TARGET_MIN,
  TILE_COUNT,
  type GameState,
  type Operator,
  type Tile,
} from './types.ts'

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Draws 0–2 large numbers from {25,50,75,100} and fills the rest from two
// of each 1–10. This distribution is tuned for solvability — widening it to
// the full 0–4-large official range is a deliberate non-goal, not an
// oversight.
export function generateNumbers(rng: () => number = Math.random): number[] {
  const largeCount = Math.floor(rng() * (MAX_LARGE_NUMBERS + 1))
  const large = shuffle([...LARGE_NUMBERS], rng).slice(0, largeCount)
  const smallPool = [...SMALL_NUMBERS, ...SMALL_NUMBERS]
  const small = shuffle(smallPool, rng).slice(0, TILE_COUNT - largeCount)
  return [...large, ...small]
}

export function generateTarget(rng: () => number = Math.random): number {
  return TARGET_MIN + Math.floor(rng() * (TARGET_MAX - TARGET_MIN + 1))
}

export function createInitialState(rng: () => number = Math.random): GameState {
  const numbers = generateNumbers(rng)
  const target = generateTarget(rng)
  let nextTileId = 0
  const pool: Tile[] = numbers.map(value => ({ id: nextTileId++, value, derived: false }))
  return {
    status: 'playing',
    pool,
    target,
    history: [],
    selectedId: null,
    pendingOp: null,
    nextTileId,
    finalValue: null,
  }
}

// Subtraction and division always resolve as (higher value) minus/divided-by
// (lower value), derived from the two tiles' values rather than which was
// tapped first — a valid move should never fail because of tap order.
// Returns null for a rejected merge (zero-result subtraction, non-exact
// division).
function computeMergeValue(op: Operator, aValue: number, bValue: number): number | null {
  const hi = Math.max(aValue, bValue)
  const lo = Math.min(aValue, bValue)
  switch (op) {
    case '+':
      return aValue + bValue
    case '×':
      return aValue * bValue
    case '−':
      return hi === lo ? null : hi - lo
    case '÷':
      return lo === 0 || hi % lo !== 0 ? null : hi / lo
  }
}

// Tile-pool model: any two tiles in the pool (original numbers or ones
// already built from a merge) can be combined into a new tile that returns
// to the pool. The merge order encodes precedence, so two independent
// partial results can be built and combined without ever needing bracket
// notation.
export function mergeTiles(state: GameState, idA: number, idB: number, op: Operator): GameState {
  if (state.status === 'locked') return state
  const a = state.pool.find(t => t.id === idA)
  const b = state.pool.find(t => t.id === idB)
  if (!a || !b || a.id === b.id) return { ...state, selectedId: null, pendingOp: null }

  const value = computeMergeValue(op, a.value, b.value)
  // Invalid merge (rejected zero subtraction / non-exact division): leave
  // the state exactly as it was, so the player's selection and pending
  // operator survive and they can pick a different second tile.
  if (value === null) return state

  const result: Tile = { id: state.nextTileId, value, derived: true }
  const pool = [...state.pool.filter(t => t.id !== a.id && t.id !== b.id), result]
  const history = [...state.history, { a, op, b, result }]
  // The instant a merge lands exactly on target, the game locks in
  // immediately — nothing left to decide, no confirm tap needed.
  const locked = value === state.target

  return {
    ...state,
    pool,
    history,
    nextTileId: state.nextTileId + 1,
    selectedId: result.id,
    pendingOp: null,
    status: locked ? 'locked' : 'playing',
    finalValue: locked ? value : null,
  }
}

export function selectTile(state: GameState, id: number): GameState {
  if (state.status === 'locked') return state
  if (!state.pool.some(t => t.id === id)) return state

  if (state.selectedId === null) {
    return { ...state, selectedId: id }
  }
  if (state.selectedId === id) {
    return { ...state, selectedId: null, pendingOp: null }
  }
  if (state.pendingOp === null) {
    return { ...state, selectedId: id }
  }
  return mergeTiles(state, state.selectedId, id, state.pendingOp)
}

export function selectOperator(state: GameState, op: Operator): GameState {
  if (state.status === 'locked' || state.selectedId === null) return state
  return { ...state, pendingOp: state.pendingOp === op ? null : op }
}

// Undo reverses the most recent merge, restoring its two source tiles to
// the pool.
export function undo(state: GameState): GameState {
  if (state.status === 'locked' || state.history.length === 0) return state
  const last = state.history[state.history.length - 1]
  const pool = [...state.pool.filter(t => t.id !== last.result.id), last.a, last.b]
  return {
    ...state,
    pool,
    history: state.history.slice(0, -1),
    selectedId: null,
    pendingOp: null,
  }
}

// A player can lock in any tile at any time as their final answer,
// including one of the original six with no operations performed at all.
export function lockIn(state: GameState, id: number): GameState {
  if (state.status === 'locked') return state
  const tile = state.pool.find(t => t.id === id)
  if (!tile) return state
  return { ...state, status: 'locked', selectedId: tile.id, pendingOp: null, finalValue: tile.value }
}

// Forces the round to end when the optional classic 30-second clock (see
// the settings screen) reaches zero. A selected tile is auto-submitted as
// the final answer, same as tapping lock in; with nothing selected the
// round simply ends with no final value.
export function expireClock(state: GameState): GameState {
  if (state.status === 'locked') return state
  if (state.selectedId !== null) return lockIn(state, state.selectedId)
  return { ...state, status: 'locked', pendingOp: null, finalValue: null }
}

// Matches the real show's numbers round scoring exactly.
export function scoreForValue(target: number, value: number | null): number {
  if (value === null) return 0
  const distance = Math.abs(target - value)
  if (distance === 0) return 10
  if (distance <= 5) return 7
  if (distance <= 10) return 5
  return 0
}
