import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResultScreen } from './ResultScreen.tsx'

afterEach(() => {
  cleanup()
})

describe('ResultScreen', () => {
  it('shows the win framing and card class for a score of 10', () => {
    const { container } = render(
      <ResultScreen
        mode="free"
        target={190}
        finalValue={190}
        score={10}
        stepCount={3}
        elapsedMs={42_000}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Onya!')).toBeInTheDocument()
    expect(container.querySelector('.overlay__card--win')).toBeInTheDocument()
  })

  it("shows the close framing and card class for a score of 7", () => {
    const { container } = render(
      <ResultScreen
        mode="free"
        target={190}
        finalValue={187}
        score={7}
        stepCount={3}
        elapsedMs={42_000}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText("She'll be right")).toBeInTheDocument()
    expect(container.querySelector('.overlay__card--close')).toBeInTheDocument()
  })

  it('shows the close framing and card class for a score of 5', () => {
    const { container } = render(
      <ResultScreen
        mode="free"
        target={190}
        finalValue={180}
        score={5}
        stepCount={3}
        elapsedMs={42_000}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText("She'll be right")).toBeInTheDocument()
    expect(container.querySelector('.overlay__card--close')).toBeInTheDocument()
  })

  it('shows the miss framing and card class for a score of 0', () => {
    const { container } = render(
      <ResultScreen
        mode="free"
        target={190}
        finalValue={140}
        score={0}
        stepCount={2}
        elapsedMs={42_000}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('No dice, mate')).toBeInTheDocument()
    expect(container.querySelector('.overlay__card--miss')).toBeInTheDocument()
  })

  it('repeats the band emoji once per step in the overlay grid', () => {
    const { container } = render(
      <ResultScreen
        mode="free"
        target={190}
        finalValue={187}
        score={7}
        stepCount={4}
        elapsedMs={42_000}
        onClose={vi.fn()}
      />,
    )

    const grid = container.querySelector('.overlay__grid')
    expect(grid?.textContent).toBe('🟧🟧🟧🟧')
  })

  it('renders at least one emoji in the overlay grid when stepCount is 0', () => {
    const { container } = render(
      <ResultScreen
        mode="free"
        target={190}
        finalValue={190}
        score={10}
        stepCount={0}
        elapsedMs={5_000}
        onClose={vi.fn()}
      />,
    )

    const grid = container.querySelector('.overlay__grid')
    expect(grid?.textContent).toBe('🟩')
  })

  it('shows a Play again button in free mode that calls onPlayAgain when clicked', () => {
    const onPlayAgain = vi.fn()
    render(
      <ResultScreen
        mode="free"
        target={190}
        finalValue={190}
        score={10}
        stepCount={1}
        elapsedMs={5_000}
        onPlayAgain={onPlayAgain}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(onPlayAgain).toHaveBeenCalledOnce()
  })

  it('does not render a Play again button in daily mode', () => {
    render(
      <ResultScreen
        mode="daily"
        target={190}
        finalValue={190}
        score={10}
        stepCount={1}
        elapsedMs={5_000}
        dateLabel="Aug 20"
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Play again' })).not.toBeInTheDocument()
  })

  it("daily mode's primary button calls onClose when clicked", () => {
    const onClose = vi.fn()
    render(
      <ResultScreen
        mode="daily"
        target={190}
        finalValue={190}
        score={10}
        stepCount={1}
        elapsedMs={5_000}
        dateLabel="Aug 20"
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Done for today' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ResultScreen: daily solvability note', () => {
  it('tells the player an exact hit was possible when they missed one, without revealing the solution', () => {
    render(
      <ResultScreen
        mode="daily"
        target={190}
        finalValue={187}
        score={7}
        stepCount={3}
        elapsedMs={42_000}
        dateLabel="Aug 20"
        wasSolvable={true}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('There was an exact hit today. Worth a hunt next time.')).toBeInTheDocument()
  })

  it('tells the player no exact hit was possible when there truly was none', () => {
    render(
      <ResultScreen
        mode="daily"
        target={190}
        finalValue={187}
        score={7}
        stepCount={3}
        elapsedMs={42_000}
        dateLabel="Aug 20"
        wasSolvable={false}
        onClose={vi.fn()}
      />,
    )

    expect(
      screen.getByText('No exact hit was possible today, so getting close was the best anyone could do.'),
    ).toBeInTheDocument()
  })

  it('shows no solvability note at all when the player landed exactly on target, regardless of wasSolvable', () => {
    render(
      <ResultScreen
        mode="daily"
        target={190}
        finalValue={190}
        score={10}
        stepCount={3}
        elapsedMs={42_000}
        dateLabel="Aug 20"
        wasSolvable={true}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText(/exact hit/)).not.toBeInTheDocument()
  })

  it('shows no solvability note in free-play mode, since solvability is only computed for the daily puzzle', () => {
    render(
      <ResultScreen mode="free" target={190} finalValue={187} score={7} stepCount={3} elapsedMs={42_000} onClose={vi.fn()} />,
    )

    expect(screen.queryByText(/exact hit/)).not.toBeInTheDocument()
  })
})
