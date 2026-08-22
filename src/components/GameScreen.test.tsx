import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameScreen } from './GameScreen.tsx'
import { createInitialState, pressNumber, pressOperator } from '../game/engine.ts'
import type { GameState } from '../game/types.ts'

afterEach(() => {
  cleanup()
})

function baseState(): GameState {
  // Deterministic six tiles via a fixed rng — duplicate values are possible
  // (the pool draws two of each small number), so tests below deliberately
  // avoid matching number buttons by their text and use tile position
  // within the numbers grid instead.
  return createInitialState(() => 0.4)
}

function renderGameScreen(overrides: Partial<Parameters<typeof GameScreen>[0]> = {}) {
  const state = overrides.state ?? baseState()
  const props = {
    state,
    resetSignal: 'test',
    hardMode: false,
    classicClockEnabled: false,
    onPressNumber: vi.fn(),
    onPressOperator: vi.fn(),
    onPressOpenBracket: vi.fn(),
    onPressCloseBracket: vi.fn(),
    onBackspace: vi.fn(),
    onLockIn: vi.fn(),
    onExpireClock: vi.fn(),
    ...overrides,
  }
  const result = render(<GameScreen {...props} />)
  return { ...props, ...result }
}

function numberButtons(container: HTMLElement): HTMLElement[] {
  return within(container.querySelector('.game-numbers')!).getAllByRole('button')
}

function workingValue(container: HTMLElement): HTMLElement {
  return container.querySelector('.game-working__value')!
}

describe('GameScreen: rendering', () => {
  it('shows the target and a placeholder before anything is typed', () => {
    const state = baseState()
    const { container } = renderGameScreen({ state })
    expect(screen.getByText(String(state.target))).toBeInTheDocument()
    expect(within(workingValue(container)).getByText('tap a number to start')).toBeInTheDocument()
  })

  it('shows all six tiles as enabled buttons, one per tile in order', () => {
    const state = baseState()
    const { container } = renderGameScreen({ state })
    const buttons = numberButtons(container)
    expect(buttons).toHaveLength(state.tiles.length)
    buttons.forEach((button, i) => {
      expect(button).toBeEnabled()
      expect(button).toHaveTextContent(String(state.tiles[i].value))
    })
  })

  it('disables Backspace and Lock in answer before anything is typed', () => {
    renderGameScreen()
    expect(screen.getByRole('button', { name: 'Backspace' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Lock in answer' })).toBeDisabled()
  })
})

describe('GameScreen: interaction wiring', () => {
  it('calls onPressNumber with the tapped tile id', () => {
    const state = baseState()
    const { container, onPressNumber } = renderGameScreen({ state })
    fireEvent.click(numberButtons(container)[0])
    expect(onPressNumber).toHaveBeenCalledWith(state.tiles[0].id)
  })

  it('calls onPressOperator with the tapped operator', () => {
    let state = baseState()
    state = pressNumber(state, state.tiles[0].id)
    const { onPressOperator } = renderGameScreen({ state })
    fireEvent.click(screen.getByRole('button', { name: 'Operator +' }))
    expect(onPressOperator).toHaveBeenCalledWith('+')
  })

  it('disables every number right after one is placed, until an operator follows', () => {
    // Grammar rule: a number can never directly follow another number
    // (no implicit multiplication), so ALL tiles are briefly unavailable —
    // not just the one just used — until an operator re-opens the slot.
    let state = baseState()
    state = pressNumber(state, state.tiles[0].id)
    const { container } = renderGameScreen({ state })
    numberButtons(container).forEach(button => expect(button).toBeDisabled())
  })

  it('re-enables the remaining tiles once an operator follows', () => {
    let state = baseState()
    state = pressNumber(state, state.tiles[0].id)
    state = pressOperator(state, '+')
    const { container } = renderGameScreen({ state })
    expect(numberButtons(container)[0]).toBeDisabled() // already used
    expect(numberButtons(container)[1]).toBeEnabled()
  })

  it('calls onBackspace and onLockIn from their buttons once enabled', () => {
    let state = baseState()
    state = pressNumber(state, state.tiles[0].id)
    const { onBackspace, onLockIn } = renderGameScreen({ state })
    fireEvent.click(screen.getByRole('button', { name: 'Backspace' }))
    expect(onBackspace).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Lock in answer' }))
    expect(onLockIn).toHaveBeenCalledOnce()
  })

  it('calls onPressOpenBracket at the start of an expression', () => {
    const { onPressOpenBracket } = renderGameScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Open bracket' }))
    expect(onPressOpenBracket).toHaveBeenCalledOnce()
  })

  it('calls onPressCloseBracket once a bracket is open and has a number in it', () => {
    let state = baseState()
    state = {
      ...state,
      tokens: [{ type: 'open' }, { type: 'number', tileId: state.tiles[0].id, value: state.tiles[0].value }],
      tiles: state.tiles.map((tile, i) => (i === 0 ? { ...tile, used: true } : tile)),
    }
    const { onPressCloseBracket } = renderGameScreen({ state })
    fireEvent.click(screen.getByRole('button', { name: 'Close bracket' }))
    expect(onPressCloseBracket).toHaveBeenCalledOnce()
  })
})

describe('GameScreen: hard mode', () => {
  it('shows the live value once the expression is complete', () => {
    let state = baseState()
    state = pressNumber(state, state.tiles[0].id)
    const { container } = renderGameScreen({ state })
    expect(screen.getByText(`= ${state.tiles[0].value}`)).toBeInTheDocument()
    expect(within(workingValue(container)).getByText(String(state.tiles[0].value))).toBeInTheDocument()
  })

  it('hides the live value in hard mode even though the expression itself still shows', () => {
    let state = baseState()
    state = pressNumber(state, state.tiles[0].id)
    const { container } = renderGameScreen({ state, hardMode: true })
    expect(screen.queryByText(`= ${state.tiles[0].value}`)).not.toBeInTheDocument()
    expect(within(workingValue(container)).getByText(String(state.tiles[0].value))).toBeInTheDocument()
  })
})

describe('GameScreen: precedence in the live preview', () => {
  it('shows a value that respects standard operator precedence, not left-to-right', () => {
    let state = baseState()
    // Build "a + b × c" using whatever the fixture's first three tiles are —
    // the live value must equal a + (b×c), not (a+b)×c.
    const [a, b, c] = state.tiles
    state = pressNumber(state, a.id)
    state = pressOperator(state, '+')
    state = pressNumber(state, b.id)
    state = pressOperator(state, '×')
    state = pressNumber(state, c.id)
    renderGameScreen({ state })
    const expected = a.value + b.value * c.value
    expect(screen.getByText(`= ${expected}`)).toBeInTheDocument()
  })
})
