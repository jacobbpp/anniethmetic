import { describe, expect, it } from 'vitest'
import {
  backspace,
  canPressCloseBracket,
  canPressEquals,
  canPressNumber,
  canPressOpenBracket,
  canPressOperator,
  createInitialState,
  evaluateExpression,
  expireClock,
  generateNumbers,
  generateTarget,
  isCompleteExpression,
  lockIn,
  pressCloseBracket,
  pressEquals,
  pressNumber,
  pressOpenBracket,
  pressOperator,
  scoreForValue,
  stepCount,
} from './engine.ts'
import { LARGE_NUMBERS, SMALL_NUMBERS, TARGET_MAX, TARGET_MIN, TILE_COUNT } from './types.ts'
import type { GameState } from './types.ts'

function withTiles(values: number[], overrides: Partial<GameState> = {}): GameState {
  const tiles = values.map((value, id) => ({ id, value, used: false }))
  return {
    status: 'playing',
    tiles,
    target: 500,
    tokens: [],
    finalValue: null,
    ...overrides,
  }
}

function tileId(state: GameState, value: number): number {
  return state.tiles.find(t => t.value === value)!.id
}

// Presses a sequence of tokens by value/operator. Numbers are matched by
// value against still-unused tiles (fine for these tests since no fixture
// repeats a value across un-used tiles at the point it's pressed).
function type(state: GameState, ...actions: (number | Operator | '(' | ')' | '=')[]): GameState {
  let next = state
  for (const action of actions) {
    if (action === '(') next = pressOpenBracket(next)
    else if (action === ')') next = pressCloseBracket(next)
    else if (action === '=') next = pressEquals(next)
    else if (typeof action === 'number') next = pressNumber(next, tileId(next, action))
    else next = pressOperator(next, action)
  }
  return next
}

type Operator = '+' | '−' | '×' | '÷'

describe('generateNumbers', () => {
  it('always draws exactly six tiles', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateNumbers(() => i / 50).length).toBe(TILE_COUNT)
    }
  })

  it('draws at most two large numbers, all from the official large set', () => {
    const numbers = generateNumbers(() => 0.99)
    const largeDrawn = numbers.filter(n => (LARGE_NUMBERS as readonly number[]).includes(n))
    expect(largeDrawn.length).toBeLessThanOrEqual(2)
  })

  it('fills the remainder from two-of-each small numbers 1-10', () => {
    const numbers = generateNumbers(() => 0)
    numbers.forEach(n => expect(SMALL_NUMBERS as readonly number[]).toContain(n))
    const counts = new Map<number, number>()
    numbers.forEach(n => counts.set(n, (counts.get(n) ?? 0) + 1))
    counts.forEach(count => expect(count).toBeLessThanOrEqual(2))
  })

  it('draws exactly the requested number of large numbers when a largeCount is given', () => {
    ;[0, 1, 2].forEach(largeCount => {
      const numbers = generateNumbers(() => 0.5, largeCount)
      const largeDrawn = numbers.filter(n => (LARGE_NUMBERS as readonly number[]).includes(n))
      expect(largeDrawn).toHaveLength(largeCount)
      expect(numbers).toHaveLength(TILE_COUNT)
    })
  })

  it('clamps an out-of-range largeCount to 0..MAX_LARGE_NUMBERS', () => {
    expect(generateNumbers(() => 0.5, -3).filter(n => (LARGE_NUMBERS as readonly number[]).includes(n))).toHaveLength(0)
    expect(generateNumbers(() => 0.5, 99).filter(n => (LARGE_NUMBERS as readonly number[]).includes(n))).toHaveLength(2)
  })

  it('falls back to a random large count when largeCount is omitted or null', () => {
    const omitted = generateNumbers(() => 0.99)
    const nulled = generateNumbers(() => 0.99, null)
    expect(omitted).toEqual(nulled)
  })
})

describe('generateTarget', () => {
  it('is always a three-digit number between 101 and 999 inclusive', () => {
    expect(generateTarget(() => 0)).toBe(TARGET_MIN)
    expect(generateTarget(() => 0.999999)).toBe(TARGET_MAX)
  })
})

describe('createInitialState', () => {
  it('starts in playing status with no tokens and every tile unused', () => {
    const state = createInitialState(() => 0.5)
    expect(state.status).toBe('playing')
    expect(state.tokens).toEqual([])
    expect(state.finalValue).toBeNull()
    expect(state.tiles).toHaveLength(TILE_COUNT)
    expect(state.tiles.every(t => !t.used)).toBe(true)
  })

  it('deals exactly the requested number of large tiles when largeCount is given', () => {
    const state = createInitialState(() => 0.5, 0)
    const largeTiles = state.tiles.filter(t => (LARGE_NUMBERS as readonly number[]).includes(t.value))
    expect(largeTiles).toHaveLength(0)
  })
})

describe('grammar validity: what can be pressed next', () => {
  it('only allows a number or an open bracket at the very start', () => {
    const state = withTiles([3, 4, 5])
    expect(canPressNumber(state, tileId(state, 3))).toBe(true)
    expect(canPressOpenBracket(state)).toBe(true)
    expect(canPressOperator(state, '+')).toBe(false)
    expect(canPressCloseBracket(state)).toBe(false)
  })

  it('only allows an operator or a close bracket after a number', () => {
    const state = type(withTiles([3, 4, 5]), 3)
    expect(canPressOperator(state, '+')).toBe(true)
    expect(canPressNumber(state, tileId(state, 4))).toBe(false)
    expect(canPressOpenBracket(state)).toBe(false)
    expect(canPressCloseBracket(state)).toBe(false) // nothing open to close
  })

  it('only allows a number or an open bracket after an operator', () => {
    const state = type(withTiles([3, 4, 5]), 3, '+')
    expect(canPressNumber(state, tileId(state, 4))).toBe(true)
    expect(canPressOpenBracket(state)).toBe(true)
    expect(canPressOperator(state, '×')).toBe(false)
    expect(canPressCloseBracket(state)).toBe(false)
  })

  it('never allows an empty bracket pair', () => {
    const state = type(withTiles([3, 4, 5]), '(')
    expect(canPressCloseBracket(state)).toBe(false)
    expect(canPressNumber(state, tileId(state, 3))).toBe(true)
    expect(canPressOpenBracket(state)).toBe(true)
  })

  it('does not allow closing a bracket that was never opened', () => {
    const state = type(withTiles([3, 4, 5]), 3)
    expect(canPressCloseBracket(state)).toBe(false)
  })

  it('allows closing once a number sits inside an open bracket', () => {
    const state = type(withTiles([3, 4, 5]), '(', 3)
    expect(canPressCloseBracket(state)).toBe(true)
  })

  it('does not allow re-using an already-placed tile', () => {
    const state = type(withTiles([3, 4, 5]), 3, '+')
    expect(canPressNumber(state, tileId(state, 3))).toBe(false)
  })
})

describe('evaluateExpression: precedence and brackets', () => {
  it('applies standard precedence: multiplication before addition', () => {
    const state = type(withTiles([2, 3, 4]), 2, '+', 3, '×', 4)
    expect(evaluateExpression(state.tokens)).toBe(14) // 2 + (3×4), not (2+3)×4
  })

  it('applies standard precedence: division before subtraction', () => {
    const state = type(withTiles([20, 10, 2]), 20, '−', 10, '÷', 2)
    expect(evaluateExpression(state.tokens)).toBe(15) // 20 − (10÷2)
  })

  it('brackets override precedence', () => {
    const state = type(withTiles([2, 3, 4]), '(', 2, '+', 3, ')', '×', 4)
    expect(evaluateExpression(state.tokens)).toBe(20) // (2+3)×4
  })

  it('evaluates a lone number with no operations as itself', () => {
    const state = type(withTiles([7, 3]), 7)
    expect(evaluateExpression(state.tokens)).toBe(7)
  })

  it('returns null for an incomplete expression (dangling operator)', () => {
    const state = type(withTiles([3, 4]), 3, '+')
    expect(isCompleteExpression(state.tokens)).toBe(false)
    expect(evaluateExpression(state.tokens)).toBeNull()
  })

  it('returns null for an incomplete expression (unclosed bracket)', () => {
    const state = type(withTiles([3, 4]), '(', 3, '+', 4)
    expect(isCompleteExpression(state.tokens)).toBe(false)
    expect(evaluateExpression(state.tokens)).toBeNull()
  })
})

describe('positive-integer-only intermediate steps', () => {
  it('rejects an operator press that would force reducing a negative pending subtraction', () => {
    // 15 − 20 pending; "+" is the same precedence as "−", so pressing it
    // would force reducing 15−20 = −5 right now.
    const state = type(withTiles([15, 20, 5]), 15, '−', 20)
    expect(canPressOperator(state, '+')).toBe(false)
    expect(canPressOperator(state, '−')).toBe(false)
    // A higher-precedence operator doesn't force the reduction yet, so it's fine.
    expect(canPressOperator(state, '×')).toBe(true)
  })

  it('rejects a close bracket that would force reducing a negative result', () => {
    const state = type(withTiles([15, 20]), '(', 15, '−', 20)
    expect(canPressCloseBracket(state)).toBe(false)
  })

  it('rejects a close bracket that exposes an invalid pending max-precedence division', () => {
    // 5 ÷ (3 − 1): closing the bracket resolves 3−1=2 (fine on its own),
    // but that immediately exposes the pending ÷'s now-fixed right operand
    // — 5÷2 is non-exact, and ÷ is max-precedence so nothing later could
    // ever rescue it. The close-bracket press itself must be rejected, not
    // just silently fail to evaluate afterward.
    const state = type(withTiles([5, 3, 1]), 5, '÷', '(', 3, '−', 1)
    expect(canPressCloseBracket(state)).toBe(false)
    const after = pressCloseBracket(state)
    expect(after).toBe(state)
  })

  it('rejects a non-exact division', () => {
    const state = type(withTiles([7, 3]), 7)
    expect(canPressOperator(state, '÷')).toBe(true)
    const withOp = pressOperator(state, '÷')
    // 7 ÷ 3 is non-exact and unrecoverable (÷ is max precedence, so nothing
    // can ever defer it) — the number press itself must be rejected.
    expect(canPressNumber(withOp, tileId(withOp, 3))).toBe(false)
    const after = pressNumber(withOp, tileId(withOp, 3))
    expect(after).toBe(withOp)
  })

  it('allows placing a number after a lower-precedence subtraction even when stopping there would be invalid, since a later divide/multiply could still rescue it', () => {
    // 5 − 10 alone would be invalid, but − is not max-precedence, so a
    // following "÷ 10" (giving 5 − 1 = 4) is a legitimate way to continue —
    // the number press must not be rejected up front the way 7÷3 was.
    const state = type(withTiles([5, 10]), 5, '−')
    expect(canPressNumber(state, tileId(state, 10))).toBe(true)
    const withNumber = pressNumber(state, tileId(state, 10))
    expect(withNumber.tokens).toHaveLength(3)
    // But locking in right here must still fail, since 5−10 alone is invalid.
    expect(evaluateExpression(withNumber.tokens)).toBeNull()
  })

  it('allows a subtraction that looks backwards at the token level but resolves validly through brackets', () => {
    // 10 − (20 − 15) = 10 − 5 = 5: each individual reduction is a positive
    // integer, even though 10 − 20 alone would not be.
    const state = type(withTiles([10, 20, 15]), 10, '−', '(', 20, '−', 15, ')')
    expect(evaluateExpression(state.tokens)).toBe(5)
  })

  it('lets addition and multiplication of any two positive numbers through unconditionally', () => {
    const state = type(withTiles([7, 7]), 7)
    expect(canPressOperator(state, '+')).toBe(true)
    expect(canPressOperator(state, '×')).toBe(true)
  })
})

describe('auto-lock', () => {
  it('locks in immediately the instant a number completes an exact match', () => {
    const state = type(withTiles([100, 87], { target: 187 }), 100, '+', 87)
    expect(state.status).toBe('locked')
    expect(state.finalValue).toBe(187)
  })

  it('locks in immediately the instant a close bracket completes an exact match', () => {
    // 70 + (50 − 20) = 70 + 30 = 100 — the close bracket is the token that
    // completes the expression, not a following number.
    const state = type(withTiles([70, 50, 20], { target: 100 }), 70, '+', '(', 50, '−', 20, ')')
    expect(state.status).toBe('locked')
    expect(state.finalValue).toBe(100)
  })

  it('does not lock when the expression misses the target', () => {
    const state = type(withTiles([100, 50], { target: 187 }), 100, '+', 50)
    expect(state.status).toBe('playing')
    expect(state.finalValue).toBeNull()
  })

  it('rejects further presses once locked', () => {
    const locked = type(withTiles([100, 87], { target: 187 }), 100, '+', 87)
    expect(locked.status).toBe('locked')
    const next = pressNumber(locked, tileId(locked, 87))
    expect(next).toBe(locked)
  })
})

describe('backspace', () => {
  it('removes the last token and frees its tile if it was a number', () => {
    let state = type(withTiles([3, 4, 5]), 3, '+', 4)
    state = backspace(state)
    expect(state.tokens).toHaveLength(2) // back to "3 +"
    expect(state.tiles.find(t => t.value === 4)!.used).toBe(false)
    expect(canPressNumber(state, tileId(state, 4))).toBe(true) // last token is the operator again
  })

  it('removes a trailing operator without touching any tile', () => {
    let state = type(withTiles([3, 4, 5]), 3, '+')
    state = backspace(state)
    expect(state.tokens).toHaveLength(1)
    expect(state.tiles.find(t => t.value === 3)!.used).toBe(true)
  })

  it('is a no-op on an empty expression', () => {
    const state = withTiles([3, 4])
    expect(backspace(state)).toBe(state)
  })

  it('is a no-op once locked', () => {
    const state = type(withTiles([100, 87], { target: 187 }), 100, '+', 87)
    expect(backspace(state)).toBe(state)
  })
})

describe('pressEquals: collapsing a sub-expression into one value', () => {
  it('flattens a complete expression into a single number token', () => {
    const state = type(withTiles([25, 10, 6], { target: 500 }), 25, '×', 10, '=')
    expect(state.tokens).toEqual([{ type: 'number', tileId: null, value: 250, collapsedFrom: expect.any(Array) }])
  })

  it('lets you keep building on the collapsed value with more operators', () => {
    const state = type(withTiles([25, 10, 6], { target: 256 }), 25, '×', 10, '=', '+', 6)
    expect(evaluateExpression(state.tokens)).toBe(256)
    const locked = lockIn(state)
    expect(locked.finalValue).toBe(256)
  })

  it('is disabled and a no-op with zero or one tokens', () => {
    const empty = withTiles([25, 10])
    expect(canPressEquals(empty)).toBe(false)
    expect(pressEquals(empty)).toBe(empty)

    const single = type(withTiles([25, 10]), 25)
    expect(canPressEquals(single)).toBe(false)
    expect(pressEquals(single)).toBe(single)
  })

  it('is disabled and a no-op when the expression is incomplete', () => {
    const state = type(withTiles([25, 10]), 25, '×')
    expect(canPressEquals(state)).toBe(false)
    expect(pressEquals(state)).toBe(state)
  })

  it('is disabled and a no-op once locked', () => {
    const state = type(withTiles([100, 87], { target: 187 }), 100, '+', 87)
    expect(canPressEquals(state)).toBe(false)
    expect(pressEquals(state)).toBe(state)
  })

  it('never needs to auto-lock itself — a target-matching expression is already locked one press earlier', () => {
    // 25 × 10 already equals target the instant the second operand lands
    // (pressNumber's own auto-lock), before "=" could ever be pressed —
    // canPressEquals is false by then, so pressEquals is a no-op.
    const state = type(withTiles([25, 10, 6], { target: 250 }), 25, '×', 10)
    expect(state.status).toBe('locked')
    expect(state.finalValue).toBe(250)
    expect(canPressEquals(state)).toBe(false)
    expect(pressEquals(state)).toBe(state)
  })

  it('keeps every tile marked used while collapsed, same as an uncollapsed expression', () => {
    const state = type(withTiles([25, 10, 6], { target: 500 }), 25, '×', 10, '=')
    expect(state.tiles.find(t => t.value === 25)!.used).toBe(true)
    expect(state.tiles.find(t => t.value === 10)!.used).toBe(true)
    expect(state.tiles.find(t => t.value === 6)!.used).toBe(false)
  })

  it('backspacing a collapsed value un-collapses it back to its source tokens instead of deleting it', () => {
    let state = type(withTiles([25, 10, 6], { target: 500 }), 25, '×', 10, '=')
    state = backspace(state)
    expect(state.tokens).toEqual([
      { type: 'number', tileId: expect.any(Number), value: 25 },
      { type: 'operator', op: '×' },
      { type: 'number', tileId: expect.any(Number), value: 10 },
    ])
    // Tiles were never actually freed while collapsed, so nothing to restore there.
    expect(state.tiles.find(t => t.value === 25)!.used).toBe(true)
    expect(state.tiles.find(t => t.value === 10)!.used).toBe(true)
    // And normal backspacing continues to work from the expanded view.
    state = backspace(state)
    expect(state.tokens).toHaveLength(2)
    expect(state.tiles.find(t => t.value === 10)!.used).toBe(false)
  })

  it('supports nested collapses, un-collapsing one layer at a time without changing the value', () => {
    let state = type(withTiles([25, 10, 6], { target: 500 }), 25, '×', 10, '=', '+', 6, '=')
    expect(evaluateExpression(state.tokens)).toBe(256)
    expect(state.tokens).toHaveLength(1)

    state = backspace(state) // un-collapses the outer "=", revealing [250 (still collapsed), +, 6]
    expect(evaluateExpression(state.tokens)).toBe(256)
    expect(state.tokens).toHaveLength(3)

    state = backspace(state) // removes the trailing "6"
    state = backspace(state) // removes the trailing "+"
    expect(state.tokens).toHaveLength(1)
    expect(evaluateExpression(state.tokens)).toBe(250)

    state = backspace(state) // now un-collapses the inner "25 × 10"
    expect(state.tokens).toEqual([
      { type: 'number', tileId: expect.any(Number), value: 25 },
      { type: 'operator', op: '×' },
      { type: 'number', tileId: expect.any(Number), value: 10 },
    ])
  })
})

describe('lockIn', () => {
  it('locks in a single original tile with no operations at all', () => {
    const state = type(withTiles([3, 4, 5], { target: 500 }), 4)
    const next = lockIn(state)
    expect(next.status).toBe('locked')
    expect(next.finalValue).toBe(4)
  })

  it('locks in a complete multi-token expression', () => {
    const state = type(withTiles([3, 4], { target: 500 }), 3, '+', 4)
    const next = lockIn(state)
    expect(next.status).toBe('locked')
    expect(next.finalValue).toBe(7)
  })

  it('is a no-op when the expression is incomplete', () => {
    const state = type(withTiles([3, 4], { target: 500 }), 3, '+')
    expect(lockIn(state)).toBe(state)
  })

  it('is a no-op once already locked', () => {
    const state = type(withTiles([100, 87], { target: 187 }), 100, '+', 87)
    expect(lockIn(state)).toBe(state)
  })
})

describe('expireClock', () => {
  it('locks in the current value when the expression is complete', () => {
    const state = type(withTiles([3, 4], { target: 500 }), 3, '+', 4)
    const next = expireClock(state)
    expect(next.status).toBe('locked')
    expect(next.finalValue).toBe(7)
  })

  it('ends the round with no final value when the expression is incomplete', () => {
    const state = type(withTiles([3, 4], { target: 500 }), 3, '+')
    const next = expireClock(state)
    expect(next.status).toBe('locked')
    expect(next.finalValue).toBeNull()
  })

  it('is a no-op once already locked', () => {
    const state = type(withTiles([100, 87], { target: 187 }), 100, '+', 87)
    expect(expireClock(state)).toBe(state)
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

describe('stepCount', () => {
  it('counts zero operations for a locked-in single number', () => {
    const state = type(withTiles([4, 5], { target: 500 }), 4)
    expect(stepCount(state)).toBe(0)
  })

  it('counts one operator per operation regardless of brackets', () => {
    const state = type(withTiles([70, 50, 20], { target: 100 }), 70, '+', '(', 50, '−', 20, ')')
    expect(stepCount(state)).toBe(2)
  })

  it('still counts every operation performed through a collapsed value, not just what remains visible', () => {
    // Fully collapsing "25 × 10 + 6" down to one token must not hide that
    // two real operations (×, +) were performed.
    const state = type(withTiles([25, 10, 6], { target: 500 }), 25, '×', 10, '=', '+', 6, '=')
    expect(state.tokens).toHaveLength(1)
    expect(stepCount(state)).toBe(2)
  })
})
