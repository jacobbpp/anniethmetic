import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BigsPickerScreen } from './BigsPickerScreen.tsx'

afterEach(() => {
  cleanup()
})

describe('BigsPickerScreen', () => {
  it('calls onPick with null for Random', () => {
    const onPick = vi.fn()
    render(<BigsPickerScreen onPick={onPick} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Random' }))
    expect(onPick).toHaveBeenCalledWith(null)
  })

  it('calls onPick with the exact chosen count for 0, 1, and 2', () => {
    const onPick = vi.fn()
    render(<BigsPickerScreen onPick={onPick} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(onPick).toHaveBeenNthCalledWith(1, 0)
    expect(onPick).toHaveBeenNthCalledWith(2, 1)
    expect(onPick).toHaveBeenNthCalledWith(3, 2)
  })

  it('calls onCancel when cancelled', () => {
    const onCancel = vi.fn()
    render(<BigsPickerScreen onPick={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
