import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AchievementToast } from './AchievementToast.tsx'
import type { Achievement } from '../game/achievements.ts'

const achievement: Achievement = {
  id: 'first-perfect',
  title: 'Onya!',
  description: 'Hit the target exactly for the first time.',
  isUnlocked: () => true,
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('AchievementToast', () => {
  it("shows the achievement's title", () => {
    render(<AchievementToast achievement={achievement} onDismiss={vi.fn()} />)
    expect(screen.getByText('Onya!')).toBeInTheDocument()
  })

  it('calls onDismiss immediately when clicked', () => {
    const onDismiss = vi.fn()
    render(<AchievementToast achievement={achievement} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByText('Onya!'))

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('calls onDismiss automatically after ~3.5s without a click', () => {
    const onDismiss = vi.fn()
    render(<AchievementToast achievement={achievement} onDismiss={onDismiss} />)

    expect(onDismiss).not.toHaveBeenCalled()
    vi.advanceTimersByTime(3500)

    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
