import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDailyTimer } from './useDailyTimer.ts'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDailyTimer', () => {
  it('reports zero elapsed time before hasStarted flips true', () => {
    const { result } = renderHook(() => useDailyTimer(false, false))
    expect(result.current.elapsedMs).toBe(0)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.elapsedMs).toBe(0)
  })

  it('starts counting the moment hasStarted flips true', () => {
    const { result, rerender } = renderHook(({ hasStarted, isLocked }) => useDailyTimer(hasStarted, isLocked), {
      initialProps: { hasStarted: false, isLocked: false },
    })
    expect(result.current.elapsedMs).toBe(0)

    rerender({ hasStarted: true, isLocked: false })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.elapsedMs).toBe(1000)

    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(result.current.elapsedMs).toBe(2500)
  })

  it('stops updating the instant isLocked flips true', () => {
    const { result, rerender } = renderHook(({ hasStarted, isLocked }) => useDailyTimer(hasStarted, isLocked), {
      initialProps: { hasStarted: true, isLocked: false },
    })

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.elapsedMs).toBe(3000)

    rerender({ hasStarted: true, isLocked: true })
    const frozenAt = result.current.elapsedMs
    expect(frozenAt).toBe(3000)

    // Advancing timers well past the lock must not move elapsedMs any further.
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.elapsedMs).toBe(frozenAt)
  })

  it('does not reset if hasStarted flips back to false after already starting (simulated undo)', () => {
    const { result, rerender } = renderHook(({ hasStarted, isLocked }) => useDailyTimer(hasStarted, isLocked), {
      initialProps: { hasStarted: true, isLocked: false },
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.elapsedMs).toBe(1000)

    // An undo can clear the current selection, temporarily flipping hasStarted
    // back to false — the one-shot latch must keep the clock running rather
    // than treating this as "not started yet".
    rerender({ hasStarted: false, isLocked: false })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.elapsedMs).toBe(2000)

    rerender({ hasStarted: true, isLocked: false })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current.elapsedMs).toBe(2500)
  })
})
