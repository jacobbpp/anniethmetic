import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  expireClock,
  extractOriginalNumbers,
  generateNumbers,
  generateTarget,
  lockIn,
  mergeTiles,
  scoreForValue,
  selectOperator,
  selectTile,
  undo,
} from './engine.ts'
import { LARGE_NUMBERS, SMALL_NUMBERS, TARGET_MAX, TARGET_MIN, TILE_COUNT } from './types.ts'
import type { GameState } from './types.ts'

function withPool(values: number[], overrides: Partial<GameState> = {}): GameState {
  const pool = values.map((value, id) => ({ id, value, derived: false }))
  return {
    status: 'playing',
    pool,
    target: 500,
    history: [],
    selectedId: null,
    pendingOp: null,
    nextTileId: values.length,
    finalValue: null,
    ...overrides,
  }
}

describe('generateNumbers', () => {
  it('always draws exactly six tiles', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateNumbers(() => i / 50).length).toBe(TILE_COUNT)
    }
  })

  it('draws at most two large numbers, all from the official large set', () => {
    // rng() = 0.99 forces the largest possible largeCount (2) every time it's consulted for that draw.
    const numbers = generateNumbers(() => 0.99)
    const largeDrawn = numbers.filter(n => (LARGE_NUMBERS as readonly number[]).includes(n))
    expect(largeDrawn.length).toBeLessThanOrEqual(2)
  })

  it('fills the remainder from two-of-each small numbers 1-10', () => {
    // rng() = 0 forces largeCount to 0, so all six tiles come from the small pool.
    const numbers = generateNumbers(() => 0)
    numbers.forEach(n => expect(SMALL_NUMBERS as readonly number[]).toContain(n))
    // No small value can appear more than twice, since the pool only has two of each.
    const counts = new Map<number, number>()
    numbers.forEach(n => counts.set(n, (counts.get(n) ?? 0) + 1))
    counts.forEach(count => expect(count).toBeLessThanOrEqual(2))
  })
})

describe('generateTarget', () => {
  it('is always a three-digit number between 101 and 999 inclusive', () => {
    expect(generateTarget(() => 0)).toBe(TARGET_MIN)
    expect(generateTarget(() => 0.999999)).toBe(TARGET_MAX)
  })
})

describe('createInitialState', () => {
  it('starts in playing status with an empty history and no selection', () => {
    const state = createInitialState(() => 0.5)
    expect(state.status).toBe('playing')
    expect(state.history).toEqual([])
    expect(state.selectedId).toBeNull()
    expect(state.pendingOp).toBeNull()
    expect(state.finalValue).toBeNull()
    expect(state.pool).toHaveLength(TILE_COUNT)
  })
})

describe('mergeTiles: order-independent subtraction and division', () => {
  it('subtracts the lower value from the higher value regardless of tap order', () => {
    const state = withPool([3, 10])
    const first = mergeTiles(state, 0, 1, '−')
    const second = mergeTiles(state, 1, 0, '−')
    expect(first.pool.find(t => t.derived)?.value).toBe(7)
    expect(second.pool.find(t => t.derived)?.value).toBe(7)
  })

  it('divides the higher value by the lower value regardless of tap order', () => {
    const state = withPool([4, 20])
    const first = mergeTiles(state, 0, 1, '÷')
    const second = mergeTiles(state, 1, 0, '÷')
    expect(first.pool.find(t => t.derived)?.value).toBe(5)
    expect(second.pool.find(t => t.derived)?.value).toBe(5)
  })
})

describe('mergeTiles: rejection rules', () => {
  it('rejects a subtraction that would produce zero, leaving the state unchanged', () => {
    const state = withPool([7, 7], { selectedId: 0, pendingOp: '−' })
    const next = mergeTiles(state, 0, 1, '−')
    expect(next).toBe(state)
    expect(next.pool).toHaveLength(2)
  })

  it('rejects a division that does not divide evenly, leaving the state unchanged', () => {
    const state = withPool([5, 7], { selectedId: 0, pendingOp: '÷' })
    const next = mergeTiles(state, 0, 1, '÷')
    expect(next).toBe(state)
  })

  it('rejects division by zero even though 0 never appears as a drawn tile, defensively', () => {
    const state = withPool([0, 7])
    const next = mergeTiles(state, 0, 1, '÷')
    expect(next).toBe(state)
  })

  it('still allows addition and multiplication of equal tiles', () => {
    const addState = withPool([7, 7])
    expect(mergeTiles(addState, 0, 1, '+').pool.find(t => t.derived)?.value).toBe(14)
    const mulState = withPool([7, 7])
    expect(mergeTiles(mulState, 0, 1, '×').pool.find(t => t.derived)?.value).toBe(49)
  })
})

describe('mergeTiles: auto-lock', () => {
  it('locks in immediately the instant a merge lands exactly on target', () => {
    const state = withPool([100, 87], { target: 187 })
    const next = mergeTiles(state, 0, 1, '+')
    expect(next.status).toBe('locked')
    expect(next.finalValue).toBe(187)
  })

  it('does not lock when the merge misses the target', () => {
    const state = withPool([100, 50], { target: 187 })
    const next = mergeTiles(state, 0, 1, '+')
    expect(next.status).toBe('playing')
    expect(next.finalValue).toBeNull()
  })

  it('rejects further merges once locked', () => {
    const locked = withPool([187], { status: 'locked', finalValue: 187, target: 187 })
    const extra = withPool([5], { status: 'locked', finalValue: 187, target: 187 }).pool[0]
    locked.pool.push(extra)
    const next = mergeTiles(locked, locked.pool[0].id, locked.pool[1].id, '+')
    expect(next).toBe(locked)
  })
})

describe('selectTile and selectOperator', () => {
  it('selects a tile, arms an operator, then merges on selecting a second tile', () => {
    let state = withPool([3, 4])
    state = selectTile(state, 0)
    expect(state.selectedId).toBe(0)
    state = selectOperator(state, '+')
    expect(state.pendingOp).toBe('+')
    state = selectTile(state, 1)
    expect(state.pool.find(t => t.derived)?.value).toBe(7)
    expect(state.pendingOp).toBeNull()
  })

  it('deselects when the same tile is tapped again, even with a pending operator', () => {
    let state = withPool([3, 4])
    state = selectTile(state, 0)
    state = selectOperator(state, '+')
    state = selectTile(state, 0)
    expect(state.selectedId).toBeNull()
    expect(state.pendingOp).toBeNull()
  })

  it('switches selection to a new tile when no operator is pending yet', () => {
    let state = withPool([3, 4, 5])
    state = selectTile(state, 0)
    state = selectTile(state, 1)
    expect(state.selectedId).toBe(1)
  })

  it('toggles an operator off when tapped a second time', () => {
    let state = withPool([3, 4])
    state = selectTile(state, 0)
    state = selectOperator(state, '+')
    state = selectOperator(state, '+')
    expect(state.pendingOp).toBeNull()
  })
})

describe('undo', () => {
  it('restores both source tiles and removes the merged result', () => {
    let state = withPool([3, 4, 10])
    state = selectTile(state, 0)
    state = selectOperator(state, '+')
    state = selectTile(state, 1)
    expect(state.pool.map(t => t.value).sort((a, b) => a - b)).toEqual([7, 10])

    state = undo(state)
    expect(state.pool.map(t => t.value).sort((a, b) => a - b)).toEqual([3, 4, 10])
    expect(state.history).toHaveLength(0)
    expect(state.selectedId).toBeNull()
  })

  it('is a no-op when there is no history', () => {
    const state = withPool([3, 4])
    expect(undo(state)).toBe(state)
  })

  it('is a no-op once the game is locked', () => {
    let state = withPool([100, 87], { target: 187 })
    state = mergeTiles(state, 0, 1, '+')
    expect(state.status).toBe('locked')
    expect(undo(state)).toBe(state)
  })
})

describe('lockIn', () => {
  it('locks in an original tile with no operations performed at all', () => {
    const state = withPool([3, 4, 5], { target: 500 })
    const next = lockIn(state, 1)
    expect(next.status).toBe('locked')
    expect(next.finalValue).toBe(4)
  })

  it('locks in a derived tile built from merges', () => {
    let state = withPool([3, 4], { target: 500 })
    state = selectTile(state, 0)
    state = selectOperator(state, '+')
    state = selectTile(state, 1)
    const derivedId = state.pool.find(t => t.derived)!.id
    const next = lockIn(state, derivedId)
    expect(next.status).toBe('locked')
    expect(next.finalValue).toBe(7)
  })

  it('is a no-op once already locked', () => {
    let state = withPool([100, 87], { target: 187 })
    state = mergeTiles(state, 0, 1, '+')
    expect(lockIn(state, state.pool[0].id)).toBe(state)
  })
})

describe('expireClock', () => {
  it('auto-submits the selected tile as the final answer', () => {
    let state = withPool([3, 4, 5], { target: 500 })
    state = selectTile(state, 1)
    state = expireClock(state)
    expect(state.status).toBe('locked')
    expect(state.finalValue).toBe(4)
  })

  it('ends the round with no final value when nothing is selected', () => {
    const state = withPool([3, 4, 5], { target: 500 })
    const next = expireClock(state)
    expect(next.status).toBe('locked')
    expect(next.finalValue).toBeNull()
  })

  it('is a no-op once already locked', () => {
    let state = withPool([100, 87], { target: 187 })
    state = mergeTiles(state, 0, 1, '+')
    expect(expireClock(state)).toBe(state)
  })
})

describe('extractOriginalNumbers', () => {
  it('returns the untouched pool when no merges have happened', () => {
    const state = withPool([3, 4, 5, 6, 10, 25])
    expect(extractOriginalNumbers(state).sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 10, 25])
  })

  it('reconstructs every original after several merges, including a chain of derived tiles', () => {
    let state = withPool([100, 50, 5, 6, 10, 9], { target: 131 })
    state = selectTile(state, 0) // 100
    state = selectOperator(state, '+')
    state = selectTile(state, 1) // 50 -> merges to 150
    const derivedId = state.pool.find(t => t.derived)!.id
    state = selectTile(state, derivedId) // 150
    state = selectOperator(state, '−')
    state = selectTile(state, state.pool.find(t => t.value === 10)!.id) // 150 - 10 = 140
    expect(extractOriginalNumbers(state).sort((a, b) => a - b)).toEqual([5, 6, 9, 10, 50, 100])
  })
})

describe('scoreForValue: scoring bands with exact boundaries', () => {
  it('scores an exact match as 10', () => {
    expect(scoreForValue(500, 500)).toBe(10)
  })

  it('scores exactly 5 away as 7', () => {
    expect(scoreForValue(500, 505)).toBe(7)
    expect(scoreForValue(500, 495)).toBe(7)
  })

  it('scores exactly 10 away as 5', () => {
    expect(scoreForValue(500, 510)).toBe(5)
    expect(scoreForValue(500, 490)).toBe(5)
  })

  it('scores 11 away as 0', () => {
    expect(scoreForValue(500, 511)).toBe(0)
    expect(scoreForValue(500, 489)).toBe(0)
  })

  it('scores no final value as 0', () => {
    expect(scoreForValue(500, null)).toBe(0)
  })
})
