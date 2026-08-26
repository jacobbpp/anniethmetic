import {
  canPressCloseBracket,
  canPressEquals,
  canPressNumber,
  canPressOpenBracket,
  canPressOperator,
  evaluateExpression,
} from '../game/engine.ts'
import { formatElapsedTime, formatExpression } from '../game/share.ts'
import type { GameState, Operator } from '../game/types.ts'
import { useCountdown } from '../hooks/useCountdown.ts'

const OPERATORS: Operator[] = ['+', '−', '×', '÷']
const CLASSIC_CLOCK_SECONDS = 30

interface GameScreenProps {
  state: GameState
  resetSignal: unknown
  hardMode: boolean
  classicClockEnabled: boolean
  elapsedMs?: number
  onPressNumber: (tileId: number) => void
  onPressOperator: (op: Operator) => void
  onPressOpenBracket: () => void
  onPressCloseBracket: () => void
  onPressEquals: () => void
  onBackspace: () => void
  onLockIn: () => void
  onExpireClock: () => void
}

export function GameScreen({
  state,
  resetSignal,
  hardMode,
  classicClockEnabled,
  elapsedMs,
  onPressNumber,
  onPressOperator,
  onPressOpenBracket,
  onPressCloseBracket,
  onPressEquals,
  onBackspace,
  onLockIn,
  onExpireClock,
}: GameScreenProps) {
  const hasStarted = state.tokens.length > 0
  const clockActive = classicClockEnabled && hasStarted && state.status !== 'locked'
  const { secondsLeft } = useCountdown(resetSignal, clockActive, CLASSIC_CLOCK_SECONDS, onExpireClock)

  const locked = state.status === 'locked'
  const liveValue = evaluateExpression(state.tokens)

  return (
    <div className="game-screen">
      {(typeof elapsedMs === 'number' || classicClockEnabled) && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {typeof elapsedMs === 'number' && <span className="pill">{formatElapsedTime(elapsedMs)}</span>}
          {classicClockEnabled && (
            <span className={secondsLeft <= 10 ? 'game-clock game-clock--urgent' : 'game-clock'}>
              {secondsLeft}s
            </span>
          )}
        </div>
      )}

      <div className="game-target">
        <span className="game-target__label">Target</span>
        <div className="game-target__tile">{state.target}</div>
      </div>

      <div className="game-working">
        <div className="game-working__value">
          {hasStarted ? (
            <span>{formatExpression(state.tokens)}</span>
          ) : (
            <span className="game-working__placeholder">tap a number to start</span>
          )}
        </div>
        {!hardMode && (
          <div className="game-working__steps">{liveValue !== null ? `= ${liveValue}` : ' '}</div>
        )}
      </div>

      <div className="game-ops">
        {OPERATORS.map(op => (
          <button
            key={op}
            type="button"
            className="game-op"
            disabled={locked || !canPressOperator(state, op)}
            onClick={() => onPressOperator(op)}
            aria-label={`Operator ${op}`}
          >
            {op}
          </button>
        ))}
        <button
          type="button"
          className="game-op"
          disabled={locked || !canPressOpenBracket(state)}
          onClick={onPressOpenBracket}
          aria-label="Open bracket"
        >
          (
        </button>
        <button
          type="button"
          className="game-op"
          disabled={locked || !canPressCloseBracket(state)}
          onClick={onPressCloseBracket}
          aria-label="Close bracket"
        >
          )
        </button>
        <button
          type="button"
          className="game-op"
          // Collapsing would show the computed value in the always-visible
          // expression display, defeating hard mode's whole point — same
          // reason the "= liveValue" hint line is hidden below.
          disabled={locked || hardMode || !canPressEquals(state)}
          onClick={onPressEquals}
          aria-label="Collapse to one number"
        >
          =
        </button>
      </div>

      <div className="game-numbers">
        {state.tiles.map(tile => (
          <button
            key={tile.id}
            type="button"
            className="game-num"
            disabled={locked || !canPressNumber(state, tile.id)}
            onClick={() => onPressNumber(tile.id)}
          >
            {tile.value}
          </button>
        ))}
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn--ghost" onClick={onBackspace} disabled={locked || state.tokens.length === 0}>
          Backspace
        </button>
        <button type="button" className="btn btn--cta" onClick={onLockIn} disabled={locked || liveValue === null}>
          Lock in answer
        </button>
      </div>
    </div>
  )
}
