import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatsScreen } from './StatsScreen.tsx'
import { createEmptyStats, recordGame } from '../game/stats.ts'
import type { StatsData } from '../game/stats.ts'
import { createEmptyStreak } from '../game/daily.ts'
import type { DailyResult, StreakData } from '../game/daily.ts'

afterEach(() => {
  cleanup()
})

function populatedStats(): StatsData {
  let stats = createEmptyStats()
  stats = recordGame(stats, 10)
  stats = recordGame(stats, 7)
  stats = recordGame(stats, 0)
  return stats
}

function populatedStreak(): StreakData {
  return { count: 4, lastPlayedDate: '2026-08-19', bestStreak: 6 }
}

function populatedHistory(): DailyResult[] {
  return [
    { date: '2026-08-18', target: 500, finalValue: 500, score: 10, stepCount: 3, solveTimeMs: 42000, wasSolvable: true },
    { date: '2026-08-19', target: 400, finalValue: 398, score: 7, stepCount: 2, solveTimeMs: 30000, wasSolvable: true },
  ]
}

function previewFor(title: string): string {
  const titleEl = screen.getByText(title)
  return titleEl.nextElementSibling?.textContent ?? ''
}

describe('StatsScreen menu previews', () => {
  it('shows empty-state preview text for every row when nothing has been played', () => {
    render(
      <StatsScreen stats={createEmptyStats()} dailyStreak={createEmptyStreak()} dailyHistory={[]} onClose={vi.fn()} />,
    )

    expect(previewFor('Score average & distribution')).toBe('No games yet')
    expect(previewFor('Daily streak')).toBe('Not started yet')
    expect(previewFor('Solve time')).toBe('No daily solves yet')
    expect(previewFor('Win rate & streak')).toBe('No games yet')
  })

  it('shows real computed preview text once games have been played', () => {
    render(
      <StatsScreen
        stats={populatedStats()}
        dailyStreak={populatedStreak()}
        dailyHistory={populatedHistory()}
        onClose={vi.fn()}
      />,
    )

    expect(previewFor('Score average & distribution')).toBe('Average 5.7 out of 10')
    expect(previewFor('Daily streak')).toBe('4 day streak')
    expect(previewFor('Solve time')).toBe('Averaging 0:36')
    expect(previewFor('Win rate & streak')).toBe('67% win rate')
  })
})

describe('StatsScreen navigation', () => {
  it('opens a section on row click and returns to the menu on back, calling onClose only from the menu', () => {
    const onClose = vi.fn()
    render(
      <StatsScreen
        stats={populatedStats()}
        dailyStreak={populatedStreak()}
        dailyHistory={populatedHistory()}
        onClose={onClose}
      />,
    )

    expect(screen.getByText('Stats')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Score average & distribution'))
    expect(screen.getByText('Score')).toBeInTheDocument()
    expect(screen.getByText('average score')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to stats' }))
    expect(screen.getByText('Stats')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Back to game' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('navigates into the daily streak, solve time, and win rate sections', () => {
    render(
      <StatsScreen
        stats={populatedStats()}
        dailyStreak={populatedStreak()}
        dailyHistory={populatedHistory()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('Daily streak'))
    expect(screen.getByText('current streak')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to stats' }))

    fireEvent.click(screen.getByText('Solve time'))
    expect(screen.getByText('Daily challenge only')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to stats' }))

    fireEvent.click(screen.getByText('Win rate & streak'))
    expect(screen.getByText('Any score above nought counts as a win.')).toBeInTheDocument()
  })
})
