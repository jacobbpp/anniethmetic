import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShareButton } from './ShareButton.tsx'

afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

describe('ShareButton', () => {
  it('copies the exact text prop to the clipboard when the Web Share API is unavailable', async () => {
    // Deleting rather than stubbing false-y: some jsdom versions define
    // navigator.share as undefined already, but this guarantees the
    // component's `if (navigator.share)` branch is skipped either way.
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<ShareButton text="tb·dev Anniethmetic · 187 vs 190 (7 pts, 3 steps, 0:42)" />)
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    await screen.findByRole('button', { name: 'Copied' })
    expect(writeText).toHaveBeenCalledOnce()
    expect(writeText).toHaveBeenCalledWith('tb·dev Anniethmetic · 187 vs 190 (7 pts, 3 steps, 0:42)')
  })

  it('flips the label to "Copied" right after a successful copy', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })

    render(<ShareButton text="share me" />)
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })
})
