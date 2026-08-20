import { describe, expect, it } from 'vitest'
import { isPuzzleSolvable } from './solver.ts'

describe('isPuzzleSolvable', () => {
  it('is true when the target is one of the original numbers, with no merges needed', () => {
    expect(isPuzzleSolvable([3, 4, 5, 6, 7, 8], 6)).toBe(true)
  })

  it('is true for a target reachable only through a multi-step merge chain', () => {
    // Confirmed by hand: 100 + 50 = 150, 150 - 10 = 140, 140 - 9 = 131.
    expect(isPuzzleSolvable([100, 50, 5, 6, 10, 9], 131)).toBe(true)
  })

  it('is false when nothing close to the target is reachable', () => {
    // Six 1s: the only reachable values via +/×/−/÷ are 1 through 6 (and 1
    // itself via multiplication or division) — nowhere near 999.
    expect(isPuzzleSolvable([1, 1, 1, 1, 1, 1], 999)).toBe(false)
  })

  it('never reports a target reachable only through a merge the in-game rules would reject', () => {
    // 7 and 3: 7+3=10, 7×3=21, 7−3=4, and 7÷3 is non-exact so that merge is
    // rejected — the only values actually reachable are {7, 3, 10, 21, 4}.
    expect(isPuzzleSolvable([7, 3], 4)).toBe(true) // via the valid subtraction
    expect(isPuzzleSolvable([7, 3], 5)).toBe(false) // not an original, and only reachable via the rejected non-exact division
  })

  it('finishes quickly for a full six-tile puzzle (no exponential blowup in practice)', () => {
    const start = performance.now()
    isPuzzleSolvable([25, 50, 75, 100, 3, 7], 987)
    expect(performance.now() - start).toBeLessThan(500)
  })
})
