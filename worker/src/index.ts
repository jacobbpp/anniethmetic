import { DurableObject } from 'cloudflare:workers'

export interface Env {
  DB: D1Database
  RATE_LIMITER: DurableObjectNamespace<RateLimiter>
}

// No credentials or cookies ever cross this API — every request carries at
// most a device id and a chosen name, both public by design once submitted.
// A wildcard origin is safe here; rate limiting and input validation are the
// real defenses, not CORS.
function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Identifies a device across the daily leaderboard and the streak
// leaderboard — never shown anywhere and carries no other identity. Names
// alone aren't a safe key: two different devices can both pick "TOM", so the
// client generates and keeps its own random id (anniethmetic-device-id in
// localStorage) instead. Matches crypto.randomUUID()'s shape comfortably.
const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/

const NAME_PATTERN = /^[A-Za-z0-9 ]+$/

// Mirrors src/game/stats.ts's SCORE_BANDS: the only four scores the real
// game can ever produce.
const VALID_SCORES = new Set([10, 7, 5, 0])

// Mirrors src/game/types.ts's TARGET_MIN/TARGET_MAX.
const TARGET_MIN = 101
const TARGET_MAX = 999

// Six tiles can merge at most five times before only one remains.
const MAX_STEP_COUNT = 5

// A day is the ceiling: the stopwatch only runs while a puzzle is actually
// in front of the player.
const MAX_DURATION_MS = 24 * 60 * 60 * 1000

function isValidName(name: unknown): name is string {
  if (typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed.length >= 1 && trimmed.length <= 8 && NAME_PATTERN.test(trimmed)
}

function isValidFinalValue(finalValue: unknown): finalValue is number | null {
  return finalValue === null || (typeof finalValue === 'number' && Number.isInteger(finalValue))
}

// --------------------------------------------------------------------------
// Daily score leaderboard
// --------------------------------------------------------------------------

interface DailyScoreCheckBody {
  date: string
  score: number
}

function isValidDailyScoreCheck(body: unknown): body is DailyScoreCheckBody {
  if (!body || typeof body !== 'object') return false
  const { date, score } = body as Record<string, unknown>
  return typeof date === 'string' && DATE_PATTERN.test(date) && typeof score === 'number' && VALID_SCORES.has(score)
}

async function tenthPlaceScore(env: Env, date: string): Promise<number | null> {
  const row = await env.DB.prepare(
    'SELECT score FROM daily_scores WHERE challenge_date = ?1 ORDER BY score DESC, duration_ms ASC LIMIT 1 OFFSET 9',
  )
    .bind(date)
    .first<{ score: number }>()
  return row ? row.score : null
}

async function handleDailyScoreCheck(request: Request, env: Env): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  if (!isValidDailyScoreCheck(body)) {
    return json({ error: 'date (YYYY-MM-DD) and score (one of 10, 7, 5, 0) are required.' }, 400)
  }

  const { date, score } = body
  const threshold = await tenthPlaceScore(env, date)
  return json({ qualifies: threshold === null || score >= threshold })
}

interface DailyScoreSubmitBody {
  date: string
  name: string
  target: number
  finalValue: number | null
  score: number
  stepCount: number
  durationMs: number
  // Used only for rate limiting, never stored.
  deviceId: string
}

function isValidDailyScoreSubmit(body: unknown): body is DailyScoreSubmitBody {
  if (!body || typeof body !== 'object') return false
  const { date, name, target, finalValue, score, stepCount, durationMs, deviceId } = body as Record<string, unknown>
  if (typeof deviceId !== 'string' || !DEVICE_ID_PATTERN.test(deviceId)) return false
  if (typeof date !== 'string' || !DATE_PATTERN.test(date)) return false
  if (!isValidName(name)) return false
  if (typeof target !== 'number' || !Number.isInteger(target) || target < TARGET_MIN || target > TARGET_MAX) return false
  if (!isValidFinalValue(finalValue)) return false
  if (typeof score !== 'number' || !VALID_SCORES.has(score)) return false
  if (typeof stepCount !== 'number' || !Number.isInteger(stepCount) || stepCount < 0 || stepCount > MAX_STEP_COUNT) return false
  return typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs >= 0 && durationMs <= MAX_DURATION_MS
}

async function handleDailyScoreSubmit(request: Request, env: Env): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  if (!isValidDailyScoreSubmit(body)) {
    return json(
      {
        error:
          'date (YYYY-MM-DD), name (1-8 letters/digits/spaces), target, finalValue, score (10|7|5|0), stepCount (0-5), durationMs, and deviceId are required.',
      },
      400,
    )
  }

  const { date, name, target, finalValue, score, stepCount, durationMs, deviceId } = body
  if (!(await allowWrite(request, env, deviceId))) return tooManyRequests()

  const cleanName = name.trim().toUpperCase()

  // Upsert on (challenge_date, device_id): a resubmission from the same
  // device on the same day replaces its row rather than adding a second one.
  await env.DB.prepare(
    `INSERT INTO daily_scores (challenge_date, device_id, name, target, final_value, score, step_count, duration_ms, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
     ON CONFLICT (challenge_date, device_id) DO UPDATE SET
       name = ?3, target = ?4, final_value = ?5, score = ?6, step_count = ?7, duration_ms = ?8, created_at = ?9`,
  )
    .bind(date, deviceId, cleanName, target, finalValue, score, stepCount, durationMs, new Date().toISOString())
    .run()

  return new Response(null, { status: 204, headers: corsHeaders() })
}

interface DailyLeaderboardEntry {
  id: number
  name: string
  target: number
  finalValue: number | null
  score: number
  stepCount: number
  durationMs: number
}

async function handleDailyLeaderboard(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const date = url.searchParams.get('date') ?? ''

  if (!DATE_PATTERN.test(date)) {
    return json({ error: 'date (YYYY-MM-DD) is required.' }, 400)
  }

  // Score first, so a fast low score never outranks a slow high one. Time
  // breaks a tie; submission time is the last word if even that ties.
  const { results } = await env.DB.prepare(
    `SELECT id, name, target, final_value, score, step_count, duration_ms FROM daily_scores
     WHERE challenge_date = ?1
     ORDER BY score DESC, duration_ms ASC, created_at ASC LIMIT 10`,
  )
    .bind(date)
    .all<{ id: number; name: string; target: number; final_value: number | null; score: number; step_count: number; duration_ms: number }>()

  const entries: DailyLeaderboardEntry[] = results.map(row => ({
    id: row.id,
    name: row.name,
    target: row.target,
    finalValue: row.final_value,
    score: row.score,
    stepCount: row.step_count,
    durationMs: row.duration_ms,
  }))

  return json({ date, entries })
}

// --------------------------------------------------------------------------
// Streak leaderboard
// --------------------------------------------------------------------------

// Exported for its own tests: the streak leaderboard's "still active" window
// depends on it, and getting it wrong across a month/year boundary would
// quietly attribute a streak to the wrong day.
export function yesterday(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

interface StreakSubmitBody {
  deviceId: string
  name: string
  streakCount: number
  lastPlayedDate: string
}

function isValidStreakSubmit(body: unknown): body is StreakSubmitBody {
  if (!body || typeof body !== 'object') return false
  const { deviceId, name, streakCount, lastPlayedDate } = body as Record<string, unknown>
  if (typeof deviceId !== 'string' || !DEVICE_ID_PATTERN.test(deviceId)) return false
  if (!isValidName(name)) return false
  if (typeof streakCount !== 'number' || !Number.isInteger(streakCount) || streakCount < 1) return false
  return typeof lastPlayedDate === 'string' && DATE_PATTERN.test(lastPlayedDate)
}

async function handleStreakSubmit(request: Request, env: Env): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  if (!isValidStreakSubmit(body)) {
    return json({ error: 'deviceId, name (1-8 letters/digits/spaces), streakCount (>=1), and lastPlayedDate (YYYY-MM-DD) are required.' }, 400)
  }

  const { deviceId, name, streakCount, lastPlayedDate } = body
  if (!(await allowWrite(request, env, deviceId))) return tooManyRequests()

  const cleanName = name.trim().toUpperCase()

  await env.DB.prepare(
    `INSERT INTO streaks (device_id, name, streak_count, last_played_date, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT (device_id) DO UPDATE SET name = ?2, streak_count = ?3, last_played_date = ?4, updated_at = ?5`,
  )
    .bind(deviceId, cleanName, streakCount, lastPlayedDate, new Date().toISOString())
    .run()

  return new Response(null, { status: 204, headers: corsHeaders() })
}

async function handleStreakLeaderboard(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const today = url.searchParams.get('today') ?? ''

  if (!DATE_PATTERN.test(today)) {
    return json({ error: 'today (YYYY-MM-DD) is required.' }, 400)
  }

  // Mirrors src/game/daily.ts's isStreakActive: still counts as live if it
  // was last played today or yesterday.
  const { results } = await env.DB.prepare(
    `SELECT name, streak_count FROM streaks
     WHERE last_played_date = ?1 OR last_played_date = ?2
     ORDER BY streak_count DESC LIMIT 10`,
  )
    .bind(today, yesterday(today))
    .all<{ name: string; streak_count: number }>()

  const entries = results.map(row => ({ name: row.name, streakCount: row.streak_count }))
  return json({ today, entries })
}

// --------------------------------------------------------------------------
// Rate limiting
// --------------------------------------------------------------------------

const WRITES_PER_WINDOW = 60
const RATE_WINDOW_MS = 60_000
const WINDOW_KEY = 'window'

interface RateWindow {
  startedAt: number
  count: number
}

export class RateLimiter extends DurableObject<Env> {
  // Fixed window rather than sliding: simpler, and the worst case is that
  // someone straddling a boundary gets up to twice the allowance briefly —
  // a fine trade for a backstop against scripted abuse.
  async consume(nowMs: number): Promise<boolean> {
    const stored = await this.ctx.storage.get<RateWindow>(WINDOW_KEY)
    const window: RateWindow =
      stored && nowMs - stored.startedAt < RATE_WINDOW_MS ? { ...stored, count: stored.count + 1 } : { startedAt: nowMs, count: 1 }

    await this.ctx.storage.put(WINDOW_KEY, window)
    return window.count <= WRITES_PER_WINDOW
  }
}

// Keyed on the player rather than the address wherever possible. A household
// shares one public address, so limiting on that alone would count everyone
// on the same sofa as one player.
export async function allowWrite(request: Request, env: Env, deviceId?: string | null): Promise<boolean> {
  const key = deviceId ? `device:${deviceId}` : `ip:${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`

  try {
    return await env.RATE_LIMITER.getByName(key).consume(Date.now())
  } catch {
    // Fails open: a problem in the limiter must never take writes down with
    // it. What it guards against is nuisance, not danger.
    return true
  }
}

function tooManyRequests(): Response {
  return json({ error: 'Too many requests. Give it a moment and try again.' }, 429)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() })
    }

    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/daily-scores/check') {
      return handleDailyScoreCheck(request, env)
    }
    if (request.method === 'POST' && url.pathname === '/daily-scores') {
      return handleDailyScoreSubmit(request, env)
    }
    if (request.method === 'GET' && url.pathname === '/daily-scores/leaderboard') {
      return handleDailyLeaderboard(request, env)
    }
    if (request.method === 'POST' && url.pathname === '/streaks') {
      return handleStreakSubmit(request, env)
    }
    if (request.method === 'GET' && url.pathname === '/streaks/leaderboard') {
      return handleStreakLeaderboard(request, env)
    }

    return json({ error: 'Not found.' }, 404)
  },
}
