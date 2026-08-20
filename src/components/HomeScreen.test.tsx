import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeScreen } from './HomeScreen.tsx'
import type { HomeScreenProps } from './HomeScreen.tsx'
import { createEmptyStats } from '../game/stats.ts'
import { createEmptyStreak } from '../game/daily.ts'
import type { DailyResult } from '../game/daily.ts'

afterEach(() => {
  cleanup()
})

function renderHomeScreen(overrides: Partial<HomeScreenProps> = {}) {
  const props: HomeScreenProps = {
    todayResult: null,
    dailyStreak: createEmptyStreak(),
    stats: createEmptyStats(),
    unlockedCount: 2,
    totalAchievementCount: 9,
    onPlayFreePlay: vi.fn(),
    onPlayDaily: vi.fn(),
    onOpenStats: vi.fn(),
    onOpenAchievements: vi.fn(),
    onOpenHowToPlay: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  }
  render(<HomeScreen {...props} />)
  return props
}

describe('HomeScreen', () => {
  it('shows the not-yet-played daily card with an enabled play button when todayResult is null', () => {
    renderHomeScreen({ todayResult: null })

    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.queryByText('Done')).not.toBeInTheDocument()
    expect(screen.getByText(/Same puzzle for everyone today/)).toBeInTheDocument()

    const playButton = screen.getByRole('button', { name: "Play today's puzzle" })
    expect(playButton).toBeEnabled()
  })

  it('shows the Done badge, result summary, and a disabled button when todayResult is set', () => {
    const todayResult: DailyResult = {
      date: '2026-08-20',
      target: 452,
      finalValue: 452,
      score: 10,
      stepCount: 3,
      solveTimeMs: 42_000,
    }
    renderHomeScreen({ todayResult })

    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.queryByText('New')).not.toBeInTheDocument()
    expect(screen.getByText('Today: 10 pts in 3 steps')).toBeInTheDocument()

    const playedButton = screen.getByRole('button', { name: 'Played — nice one' })
    expect(playedButton).toBeDisabled()
  })

  it('singularizes the step count when there was exactly one step', () => {
    const todayResult: DailyResult = {
      date: '2026-08-20',
      target: 452,
      finalValue: 452,
      score: 5,
      stepCount: 1,
      solveTimeMs: 10_000,
    }
    renderHomeScreen({ todayResult })

    expect(screen.getByText('Today: 5 pts in 1 step')).toBeInTheDocument()
  })

  it('calls onPlayFreePlay when the free play button is clicked', () => {
    const props = renderHomeScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Play free play' }))
    expect(props.onPlayFreePlay).toHaveBeenCalledOnce()
  })

  it('calls onPlayDaily when the daily play button is clicked and not yet played', () => {
    const props = renderHomeScreen({ todayResult: null })
    fireEvent.click(screen.getByRole('button', { name: "Play today's puzzle" }))
    expect(props.onPlayDaily).toHaveBeenCalledOnce()
  })

  it('calls onOpenStats, onOpenAchievements, and onOpenHowToPlay from their links', () => {
    const props = renderHomeScreen({ unlockedCount: 3, totalAchievementCount: 9 })

    fireEvent.click(screen.getByRole('button', { name: 'See all stats →' }))
    expect(props.onOpenStats).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: '🏆 3/9 achievements' }))
    expect(props.onOpenAchievements).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'How to play' }))
    expect(props.onOpenHowToPlay).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(props.onOpenSettings).toHaveBeenCalledOnce()
  })

  it('shows the average score to 1 decimal place, or a dash with no games played', () => {
    renderHomeScreen({ stats: createEmptyStats() })
    expect(screen.getByText('—')).toBeInTheDocument()

    cleanup()

    renderHomeScreen({
      stats: { totalGames: 2, totalScore: 15, scoreDistribution: [0, 1, 1, 0], currentWinStreak: 2, bestWinStreak: 2 },
    })
    expect(screen.getByText('7.5')).toBeInTheDocument()
  })

  it('shows the current daily streak count', () => {
    renderHomeScreen({ dailyStreak: { count: 4, lastPlayedDate: '2026-08-19', bestStreak: 6 } })
    expect(screen.getByText('4')).toBeInTheDocument()
  })
})
