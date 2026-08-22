import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from './SettingsScreen.tsx'

function renderScreen(overrides: Partial<Parameters<typeof SettingsScreen>[0]> = {}) {
  const props = {
    muted: false,
    onToggleMuted: vi.fn(),
    theme: 'dark' as const,
    onToggleTheme: vi.fn(),
    hardMode: false,
    onToggleHardMode: vi.fn(),
    classicClock: false,
    onToggleClassicClock: vi.fn(),
    onOpenHowToPlay: vi.fn(),
    onOpenWhatsNew: vi.fn(),
    onResetData: vi.fn(),
    onClose: vi.fn(),
    version: '1.0.0',
    ...overrides,
  }
  render(<SettingsScreen {...props} />)
  return props
}

// The label text and its toggle button are siblings inside a `.settings-row`
// (not an associated <label>), so we scope to the row and grab the switch
// inside it rather than querying by accessible name.
function switchInRowLabeled(labelText: string) {
  const row = screen.getByText(labelText).closest('.settings-row')
  if (!row) throw new Error(`could not find .settings-row containing "${labelText}"`)
  return within(row as HTMLElement).getByRole('switch')
}

afterEach(() => {
  cleanup()
})

describe('SettingsScreen', () => {
  it('calls onToggleMuted exactly once when the sound toggle is clicked', () => {
    const props = renderScreen()
    fireEvent.click(switchInRowLabeled('Sound'))
    expect(props.onToggleMuted).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleTheme exactly once when the theme toggle is clicked', () => {
    const props = renderScreen()
    fireEvent.click(switchInRowLabeled('Theme'))
    expect(props.onToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleHardMode exactly once when the hard mode toggle is clicked', () => {
    const props = renderScreen()
    fireEvent.click(switchInRowLabeled('Hard mode'))
    expect(props.onToggleHardMode).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleClassicClock exactly once when the classic clock toggle is clicked', () => {
    const props = renderScreen()
    fireEvent.click(switchInRowLabeled('Classic clock'))
    expect(props.onToggleClassicClock).toHaveBeenCalledTimes(1)
  })

  it('reflects sound state: toggle is "on" (checked) when not muted', () => {
    renderScreen({ muted: false })
    expect(switchInRowLabeled('Sound')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('On')).toBeInTheDocument()
  })

  it('reflects sound state: toggle is "off" (unchecked) when muted', () => {
    renderScreen({ muted: true })
    expect(switchInRowLabeled('Sound')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Off')).toBeInTheDocument()
  })

  it('calls onOpenHowToPlay when the how to play row is clicked', () => {
    const props = renderScreen()
    fireEvent.click(screen.getByRole('button', { name: /how to play/i }))
    expect(props.onOpenHowToPlay).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenWhatsNew when the what\'s new row is clicked', () => {
    const props = renderScreen()
    fireEvent.click(screen.getByRole('button', { name: /what's new/i }))
    expect(props.onOpenWhatsNew).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the back arrow is clicked', () => {
    const props = renderScreen()
    fireEvent.click(screen.getByRole('button', { name: /back to game/i }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('shows the version string', () => {
    renderScreen({ version: '2.3.1' })
    expect(screen.getByText('Anniethmetic v2.3.1')).toBeInTheDocument()
  })

  describe('reset all data confirm flow', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('does not call onResetData on a single click, but does on a second click', () => {
      const props = renderScreen()
      const resetButton = screen.getByRole('button', { name: 'Reset all data' })

      fireEvent.click(resetButton)
      expect(props.onResetData).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Tap again to confirm' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Tap again to confirm' }))
      expect(props.onResetData).toHaveBeenCalledTimes(1)
    })

    it('reverts the armed state after ~3s, requiring confirmation again', () => {
      const props = renderScreen()
      const resetButton = screen.getByRole('button', { name: 'Reset all data' })

      fireEvent.click(resetButton)
      expect(screen.getByRole('button', { name: 'Tap again to confirm' })).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(3100)
      })

      // Button should have reverted back to the unarmed label.
      expect(screen.getByRole('button', { name: 'Reset all data' })).toBeInTheDocument()

      // A click now should just re-arm it, not perform the reset.
      fireEvent.click(screen.getByRole('button', { name: 'Reset all data' }))
      expect(props.onResetData).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Tap again to confirm' })).toBeInTheDocument()
    })
  })
})
