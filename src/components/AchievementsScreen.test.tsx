import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AchievementsScreen } from './AchievementsScreen.tsx'
import { ACHIEVEMENTS, countUnlocked } from '../game/achievements.ts'

afterEach(() => {
  cleanup()
})

describe('AchievementsScreen', () => {
  it('shows the unlocked count from countUnlocked', () => {
    const unlockedAt = { [ACHIEVEMENTS[0].id]: Date.now() }
    render(<AchievementsScreen unlockedAt={unlockedAt} onClose={vi.fn()} />)

    expect(screen.getByText(`${countUnlocked(unlockedAt)} / ${ACHIEVEMENTS.length} unlocked`)).toBeInTheDocument()
  })

  it('marks a row unlocked when its id is present in unlockedAt, and locked otherwise', () => {
    const unlockedId = ACHIEVEMENTS[0].id
    const lockedId = ACHIEVEMENTS[ACHIEVEMENTS.length - 1].id
    const unlockedAt = { [unlockedId]: Date.now() }

    render(<AchievementsScreen unlockedAt={unlockedAt} onClose={vi.fn()} />)

    const unlockedTitle = ACHIEVEMENTS.find(a => a.id === unlockedId)!.title
    const lockedTitle = ACHIEVEMENTS.find(a => a.id === lockedId)!.title

    const unlockedRow = screen.getByText(unlockedTitle).closest('.achievement-row')
    const lockedRow = screen.getByText(lockedTitle).closest('.achievement-row')

    expect(unlockedRow).toHaveClass('achievement-row--unlocked')
    expect(lockedRow).toHaveClass('achievement-row--locked')
  })

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn()
    render(<AchievementsScreen unlockedAt={{}} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
