import { formatElapsedTime } from '../game/share.ts'
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
  onSelectTile: (id: number) => void
  onSelectOperator: (op: Operator) => void
  onUndo: () => void
  onLockIn: () => void
  onExpireClock: () => void
}

function tileClassName(derived: boolean, selected: boolean): string {
  const classes = ['game-num']
  if (derived) classes.push('is-derived')
  if (selected) classes.push('is-selected')
  return classes.join(' ')
}

export function GameScreen({
  state,
  resetSignal,
  hardMode,
  classicClockEnabled,
  elapsedMs,
  onSelectTile,
  onSelectOperator,
  onUndo,
  onLockIn,
  onExpireClock,
}: GameScreenProps) {
  const hasStarted = state.selectedId !== null || state.history.length > 0
  const clockActive = classicClockEnabled && hasStarted && state.status !== 'locked'
  const { secondsLeft } = useCountdown(resetSignal, clockActive, CLASSIC_CLOCK_SECONDS, onExpireClock)

  const selectedTile = state.pool.find(tile => tile.id === state.selectedId) ?? null
  const stepsText = state.history.map(h => `${h.a.value} ${h.op} ${h.b.value} = ${h.result.value}`).join('  ·  ')

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
          {selectedTile ? (
            <span>
              {selectedTile.value}
              {state.pendingOp ? ` ${state.pendingOp} ?` : ''}
            </span>
          ) : (
            <span className="game-working__placeholder">select a tile</span>
          )}
        </div>
        {!hardMode && <div className="game-working__steps">{stepsText}</div>}
      </div>

      <div className="game-ops">
        {OPERATORS.map(op => (
          <button
            key={op}
            type="button"
            className={state.pendingOp === op ? 'game-op is-active' : 'game-op'}
            disabled={state.status === 'locked' || state.selectedId === null}
            onClick={() => onSelectOperator(op)}
            aria-label={`Operator ${op}`}
          >
            {op}
          </button>
        ))}
      </div>

      <div className="game-numbers">
        {state.pool.map(tile => (
          <button
            key={tile.id}
            type="button"
            className={tileClassName(tile.derived, tile.id === state.selectedId)}
            disabled={state.status === 'locked'}
            onClick={() => onSelectTile(tile.id)}
          >
            {tile.value}
          </button>
        ))}
      </div>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onUndo}
          disabled={state.status === 'locked' || state.history.length === 0}
        >
          Undo
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={onLockIn}
          disabled={state.status === 'locked' || state.selectedId === null}
        >
          Lock in answer
        </button>
      </div>
    </div>
  )
}
