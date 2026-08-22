import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WhatsNewScreen } from './WhatsNewScreen.tsx'
import type { ChangelogEntry } from '../game/changelog.ts'

afterEach(() => {
  cleanup()
})

function entries(): ChangelogEntry[] {
  return [
    { version: '0.4.0', date: '2026-08-22', highlights: ['Calendar view', 'Free play vs. daily split'] },
    { version: '0.3.0', date: '2026-08-20', highlights: ['Type a full equation'] },
  ]
}

describe('WhatsNewScreen', () => {
  it('renders every entry with its version, date, and highlights', () => {
    render(<WhatsNewScreen entries={entries()} onClose={vi.fn()} />)

    expect(screen.getByText('v0.4.0')).toBeInTheDocument()
    expect(screen.getByText('v0.3.0')).toBeInTheDocument()
    expect(screen.getByText('Calendar view')).toBeInTheDocument()
    expect(screen.getByText('Free play vs. daily split')).toBeInTheDocument()
    expect(screen.getByText('Type a full equation')).toBeInTheDocument()
  })

  it('calls onClose when the dismiss button is clicked', () => {
    const onClose = vi.fn()
    render(<WhatsNewScreen entries={entries()} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
