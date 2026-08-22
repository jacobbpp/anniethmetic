import { describe, expect, it } from 'vitest'
import {
  bandEmojiForScore,
  buildDailyShareText,
  buildShareText,
  buildStreakShareText,
  formatElapsedTime,
} from './share.ts'

describe('formatElapsedTime', () => {
  it('renders under a minute as 0:ss with a zero-padded seconds field', () => {
    expect(formatElapsedTime(5000)).toBe('0:05')
    expect(formatElapsedTime(42000)).toBe('0:42')
  })

  it('renders a minute or more without a leading zero on the minutes', () => {
    expect(formatElapsedTime(65000)).toBe('1:05')
  })

  it('rolls over the 60-second boundary from 0:59 to 1:00', () => {
    expect(formatElapsedTime(59000)).toBe('0:59')
    expect(formatElapsedTime(60000)).toBe('1:00')
  })
})

describe('bandEmojiForScore', () => {
  it('scores an exact target match as the green band', () => {
    expect(bandEmojiForScore(10)).toBe('🟩')
  })

  it('scores both "close" point values (7 and 5) as the same amber band', () => {
    expect(bandEmojiForScore(7)).toBe('🟧')
    expect(bandEmojiForScore(5)).toBe('🟧')
  })

  it('scores zero points as a true miss', () => {
    expect(bandEmojiForScore(0)).toBe('⬛')
  })
})

describe('buildShareText', () => {
  it('matches the product brief example exactly', () => {
    const text = buildShareText({ target: 190, finalValue: 187, score: 7, stepCount: 3, elapsedMs: 42000 })
    const lines = text.split('\n')
    expect(lines[0]).toBe('tb·dev Anniethmetic · 187 vs 190 (7 pts, 3 steps, 0:42)')
  })

  it('pluralizes step count: singular for one step, plural for more', () => {
    const oneStep = buildShareText({ target: 500, finalValue: 500, score: 10, stepCount: 1, elapsedMs: 1000 })
    expect(oneStep.split('\n')[0]).toContain('1 step,')
    const twoSteps = buildShareText({ target: 500, finalValue: 500, score: 10, stepCount: 2, elapsedMs: 1000 })
    expect(twoSteps.split('\n')[0]).toContain('2 steps,')
  })

  it('renders a dash for a null final value (no lock-in reached)', () => {
    const text = buildShareText({ target: 500, finalValue: null, score: 0, stepCount: 0, elapsedMs: 1000 })
    expect(text.split('\n')[0]).toBe('tb·dev Anniethmetic · – vs 500 (0 pts, 0 steps, 0:01)')
  })

  it('still shows exactly one band emoji when locking in an original tile with zero merges', () => {
    const text = buildShareText({ target: 500, finalValue: 500, score: 10, stepCount: 0, elapsedMs: 1000 })
    expect(text.split('\n')[1]).toBe('🟩')
  })

  it('repeats the band emoji once per step when steps were taken', () => {
    const text = buildShareText({ target: 190, finalValue: 187, score: 7, stepCount: 3, elapsedMs: 42000 })
    expect(text.split('\n')[1]).toBe('🟧🟧🟧')
  })

  it('is exactly two lines', () => {
    const text = buildShareText({ target: 190, finalValue: 187, score: 7, stepCount: 3, elapsedMs: 42000 })
    expect(text.split('\n')).toHaveLength(2)
  })
})

describe('buildDailyShareText', () => {
  it('inserts the date label into the daily headline', () => {
    const text = buildDailyShareText({
      target: 190,
      finalValue: 187,
      score: 7,
      stepCount: 3,
      elapsedMs: 42000,
      dateLabel: 'Aug 20',
    })
    expect(text.split('\n')[0]).toBe('tb·dev Anniethmetic Daily (Aug 20) · 187 vs 190 (7 pts, 3 steps, 0:42)')
  })

  it('shares the same band-line logic as the non-daily variant', () => {
    const text = buildDailyShareText({
      target: 500,
      finalValue: 500,
      score: 10,
      stepCount: 0,
      elapsedMs: 1000,
      dateLabel: 'Aug 20',
    })
    expect(text.split('\n')[1]).toBe('🟩')
  })
})

describe('buildStreakShareText', () => {
  it('includes the streak count', () => {
    expect(buildStreakShareText(7)).toBe('🔥 7 day streak on Anniethmetic Daily!')
  })
})
