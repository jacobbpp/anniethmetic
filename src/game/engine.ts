import {
  LARGE_NUMBERS,
  MAX_LARGE_NUMBERS,
  SMALL_NUMBERS,
  TARGET_MAX,
  TARGET_MIN,
  TILE_COUNT,
  type ExpressionToken,
  type GameState,
  type Operator,
  type Tile,
} from './types.ts'

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Draws 0–2 large numbers from {25,50,75,100} and fills the rest from two
// of each 1–10. This distribution is tuned for solvability — widening it to
// the full 0–4-large official range is a deliberate non-goal, not an
// oversight.
export function generateNumbers(rng: () => number = Math.random): number[] {
  const largeCount = Math.floor(rng() * (MAX_LARGE_NUMBERS + 1))
  const large = shuffle([...LARGE_NUMBERS], rng).slice(0, largeCount)
  const smallPool = [...SMALL_NUMBERS, ...SMALL_NUMBERS]
  const small = shuffle(smallPool, rng).slice(0, TILE_COUNT - largeCount)
  return [...large, ...small]
}

export function generateTarget(rng: () => number = Math.random): number {
  return TARGET_MIN + Math.floor(rng() * (TARGET_MAX - TARGET_MIN + 1))
}

export function createInitialState(rng: () => number = Math.random): GameState {
  const numbers = generateNumbers(rng)
  const target = generateTarget(rng)
  const tiles: Tile[] = numbers.map((value, id) => ({ id, value, used: false }))
  return {
    status: 'playing',
    tiles,
    target,
    tokens: [],
    finalValue: null,
  }
}

const PRECEDENCE: Record<Operator, number> = { '+': 1, '−': 1, '×': 2, '÷': 2 }
const MAX_PRECEDENCE = Math.max(...Object.values(PRECEDENCE))

// Combines two values in the order given (no tap-order reordering — the
// player wrote it left-to-right, so it means what it says) and enforces the
// real numbers-round rule: every intermediate step must land on a positive
// whole number, not just the final answer. Returns null for a rejected step.
function reduce(a: number, op: Operator, b: number): number | null {
  let result: number
  switch (op) {
    case '+':
      result = a + b
      break
    case '×':
      result = a * b
      break
    case '−':
      result = a - b
      break
    case '÷':
      if (b === 0 || a % b !== 0) return null
      result = a / b
      break
  }
  return Number.isInteger(result) && result > 0 ? result : null
}

function popReduce(operandStack: number[], operatorStack: (Operator | '(')[]): boolean {
  const op = operatorStack.pop()
  if (op === undefined || op === '(') return false
  const b = operandStack.pop()
  const a = operandStack.pop()
  if (a === undefined || b === undefined) return false
  const result = reduce(a, op, b)
  if (result === null) return false
  operandStack.push(result)
  return true
}

interface Derivation {
  operandStack: number[]
  operatorStack: (Operator | '(')[]
  valid: boolean
}

// Runs the standard shunting-yard algorithm over the whole token list from
// scratch (token lists here are always tiny — at most six numbers and a
// handful of operators/brackets — so re-deriving on every keystroke rather
// than maintaining incremental stack state is simpler and still instant).
// Precedence and brackets are handled exactly as BIDMAS/BODMAS dictates:
// higher-precedence pending operators are left on the stack (not reduced
// early) until something of equal-or-lower precedence, a close bracket, or
// the end of the expression forces them to resolve. Every reduction along
// the way is validated by `reduce`, so a step that would go negative or
// fractional makes the whole derivation invalid at the point it happens —
// not retroactively once the whole expression is typed.
//
// A pending operator at the highest precedence level can never be deferred
// by anything that might come next (nothing outranks it), so its validity
// is knowable the instant its right operand is fully known — reduce it
// eagerly rather than waiting for a later token to force it. This applies
// whenever a value newly lands on top of the operand stack, whether from a
// plain number ("7 ÷ 3" — invalid the moment "3" arrives) or from a bracket
// that just resolved ("5 ÷ (3 − 1)" — invalid the moment ")" resolves the
// bracket to 2, exposing the pending ÷'s now-fixed right operand). Lower-
// precedence operators (+/−) stay pending in both cases, since a following
// ×/÷ can still legitimately claim this value first.
function eagerlyReduceMaxPrecedence(operandStack: number[], operatorStack: (Operator | '(')[]): boolean {
  while (
    operatorStack.length > 0 &&
    operatorStack[operatorStack.length - 1] !== '(' &&
    PRECEDENCE[operatorStack[operatorStack.length - 1] as Operator] >= MAX_PRECEDENCE
  ) {
    if (!popReduce(operandStack, operatorStack)) return false
  }
  return true
}

function deriveEvaluationState(tokens: ExpressionToken[]): Derivation {
  const operandStack: number[] = []
  const operatorStack: (Operator | '(')[] = []

  for (const token of tokens) {
    if (token.type === 'number') {
      operandStack.push(token.value)
      if (!eagerlyReduceMaxPrecedence(operandStack, operatorStack)) return { operandStack, operatorStack, valid: false }
    } else if (token.type === 'open') {
      operatorStack.push('(')
    } else if (token.type === 'close') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
        if (!popReduce(operandStack, operatorStack)) return { operandStack, operatorStack, valid: false }
      }
      operatorStack.pop() // discard the matching '('
      if (!eagerlyReduceMaxPrecedence(operandStack, operatorStack)) return { operandStack, operatorStack, valid: false }
    } else {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1] !== '(' &&
        PRECEDENCE[operatorStack[operatorStack.length - 1] as Operator] >= PRECEDENCE[token.op]
      ) {
        if (!popReduce(operandStack, operatorStack)) return { operandStack, operatorStack, valid: false }
      }
      operatorStack.push(token.op)
    }
  }

  return { operandStack, operatorStack, valid: true }
}

function bracketBalance(tokens: ExpressionToken[]): number {
  let depth = 0
  for (const token of tokens) {
    if (token.type === 'open') depth++
    else if (token.type === 'close') depth--
  }
  return depth
}

// A complete expression is one that could be locked in right now: at least
// one token, brackets fully closed, and ending on a number or a close
// bracket (never dangling on an operator or an unclosed open bracket).
export function isCompleteExpression(tokens: ExpressionToken[]): boolean {
  if (tokens.length === 0) return false
  const last = tokens[tokens.length - 1]
  if (last.type !== 'number' && last.type !== 'close') return false
  return bracketBalance(tokens) === 0
}

// Evaluates a complete expression with standard operator precedence and
// bracket grouping. Returns null if the expression isn't complete, or if
// any step along the way (including the final flush of whatever operators
// are still pending) isn't a positive whole number.
export function evaluateExpression(tokens: ExpressionToken[]): number | null {
  if (!isCompleteExpression(tokens)) return null
  const { operandStack, operatorStack, valid } = deriveEvaluationState(tokens)
  if (!valid) return null
  while (operatorStack.length > 0) {
    if (!popReduce(operandStack, operatorStack)) return null
  }
  return operandStack.length === 1 ? operandStack[0] : null
}

type TokenKind = 'number' | 'operator' | 'open' | 'close' | 'start'

function lastTokenKind(tokens: ExpressionToken[]): TokenKind {
  if (tokens.length === 0) return 'start'
  return tokens[tokens.length - 1].type
}

// A number can follow the start of the expression, an operator, or an open
// bracket — never another number or a close bracket (no implicit
// multiplication like "(5)(3)"). Also rejected if it would complete a
// max-precedence (×/÷) operation that's invalid — e.g. "7 ÷" then "3" — since
// nothing can ever defer that reduction, it's unrecoverable the instant the
// second operand lands.
export function canPressNumber(state: GameState, tileId: number): boolean {
  if (state.status === 'locked') return false
  const tile = state.tiles.find(t => t.id === tileId)
  if (!tile || tile.used) return false
  const kind = lastTokenKind(state.tokens)
  if (kind !== 'start' && kind !== 'operator' && kind !== 'open') return false
  return deriveEvaluationState([...state.tokens, { type: 'number', tileId, value: tile.value }]).valid
}

// An operator can follow a number or a close bracket, and only if it
// wouldn't force an invalid reduction right now (e.g. typing "+" immediately
// after "15 − 20" would force reducing that negative result).
export function canPressOperator(state: GameState, op: Operator): boolean {
  if (state.status === 'locked') return false
  const kind = lastTokenKind(state.tokens)
  if (kind !== 'number' && kind !== 'close') return false
  return deriveEvaluationState([...state.tokens, { type: 'operator', op }]).valid
}

// An open bracket can start the expression, or follow an operator or
// another open bracket.
export function canPressOpenBracket(state: GameState): boolean {
  if (state.status === 'locked') return false
  const kind = lastTokenKind(state.tokens)
  return kind === 'start' || kind === 'operator' || kind === 'open'
}

// A close bracket needs an unmatched open bracket to close, must follow a
// number or another close bracket (brackets are never empty), and must not
// force an invalid reduction when it resolves everything back to the match.
export function canPressCloseBracket(state: GameState): boolean {
  if (state.status === 'locked') return false
  const kind = lastTokenKind(state.tokens)
  if (kind !== 'number' && kind !== 'close') return false
  if (bracketBalance(state.tokens) <= 0) return false
  return deriveEvaluationState([...state.tokens, { type: 'close' }]).valid
}

// The instant a complete expression lands exactly on target, the game locks
// in immediately — nothing left to decide, no confirm tap needed.
function checkAutoLock(state: GameState): GameState {
  if (!isCompleteExpression(state.tokens)) return state
  const value = evaluateExpression(state.tokens)
  if (value !== null && value === state.target) {
    return { ...state, status: 'locked', finalValue: value }
  }
  return state
}

export function pressNumber(state: GameState, tileId: number): GameState {
  if (!canPressNumber(state, tileId)) return state
  const tile = state.tiles.find(t => t.id === tileId)!
  const tiles = state.tiles.map(t => (t.id === tileId ? { ...t, used: true } : t))
  const tokens: ExpressionToken[] = [...state.tokens, { type: 'number', tileId, value: tile.value }]
  return checkAutoLock({ ...state, tiles, tokens })
}

export function pressOperator(state: GameState, op: Operator): GameState {
  if (!canPressOperator(state, op)) return state
  const tokens: ExpressionToken[] = [...state.tokens, { type: 'operator', op }]
  return { ...state, tokens }
}

export function pressOpenBracket(state: GameState): GameState {
  if (!canPressOpenBracket(state)) return state
  const tokens: ExpressionToken[] = [...state.tokens, { type: 'open' }]
  return { ...state, tokens }
}

export function pressCloseBracket(state: GameState): GameState {
  if (!canPressCloseBracket(state)) return state
  const tokens: ExpressionToken[] = [...state.tokens, { type: 'close' }]
  return checkAutoLock({ ...state, tokens })
}

// Removes the last typed token, freeing its tile back up if it was a number.
export function backspace(state: GameState): GameState {
  if (state.status === 'locked' || state.tokens.length === 0) return state
  const last = state.tokens[state.tokens.length - 1]
  const tokens = state.tokens.slice(0, -1)
  if (last.type === 'number') {
    const tiles = state.tiles.map(t => (t.id === last.tileId ? { ...t, used: false } : t))
    return { ...state, tiles, tokens }
  }
  return { ...state, tokens }
}

// A player can lock in any complete expression at any time as their final
// answer, including a single original number with no operations at all.
// No-ops if the expression isn't complete yet.
export function lockIn(state: GameState): GameState {
  if (state.status === 'locked') return state
  const value = evaluateExpression(state.tokens)
  if (value === null) return state
  return { ...state, status: 'locked', finalValue: value }
}

// Forces the round to end when the optional classic 30-second clock (see
// the settings screen) reaches zero. Whatever's currently typed gets
// evaluated if it's a complete expression; otherwise the round ends with no
// final value.
export function expireClock(state: GameState): GameState {
  if (state.status === 'locked') return state
  return { ...state, status: 'locked', finalValue: evaluateExpression(state.tokens) }
}

// Matches the real show's numbers round scoring exactly.
export function scoreForValue(target: number, value: number | null): number {
  if (value === null) return 0
  const distance = Math.abs(target - value)
  if (distance === 0) return 10
  if (distance <= 5) return 7
  if (distance <= 10) return 5
  return 0
}

// One "step" per operation performed — matches how many operators appear in
// the final expression, which is what a player actually did to get there.
export function stepCount(state: GameState): number {
  return state.tokens.filter(token => token.type === 'operator').length
}
