import { env, SELF } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM daily_scores').run()
})

interface SubmitBody {
  date: string
  name: string
  target: number
  finalValue: number | null
  score: number
  stepCount: number
  durationMs: number
  deviceId: string
}

function body(overrides: Partial<SubmitBody> = {}): SubmitBody {
  return {
    date: '2026-08-20',
    name: 'ANNIE',
    target: 500,
    finalValue: 500,
    score: 10,
    stepCount: 3,
    durationMs: 42_000,
    deviceId: 'device-aaaaaaaa',
    ...overrides,
  }
}

function submit(overrides: Partial<SubmitBody> = {}) {
  return SELF.fetch('http://example.com/daily-scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body(overrides)),
  })
}

function leaderboard(date: string) {
  return SELF.fetch(`http://example.com/daily-scores/leaderboard?date=${date}`)
}

describe('POST /daily-scores/check', () => {
  it('qualifies any score when fewer than ten entries exist for the day', async () => {
    const response = await SELF.fetch('http://example.com/daily-scores/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-08-20', score: 0 }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ qualifies: true })
  })

  it('stops qualifying a low score once ten better scores exist that day', async () => {
    for (let i = 0; i < 10; i++) {
      await submit({ deviceId: `device-${i}aaaaaaa`, score: 10 })
    }
    const response = await SELF.fetch('http://example.com/daily-scores/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-08-20', score: 0 }),
    })
    expect(await response.json()).toEqual({ qualifies: false })
  })

  it('rejects a score outside the four real bands', async () => {
    const response = await SELF.fetch('http://example.com/daily-scores/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-08-20', score: 6 }),
    })
    expect(response.status).toBe(400)
  })

  it('rejects a malformed date', async () => {
    const response = await SELF.fetch('http://example.com/daily-scores/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '20-08-2026', score: 10 }),
    })
    expect(response.status).toBe(400)
  })
})

describe('POST /daily-scores', () => {
  it('accepts a valid submission and stores it', async () => {
    const response = await submit()
    expect(response.status).toBe(204)

    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: unknown[] }
    expect(entries).toHaveLength(1)
  })

  it('upserts on (date, device) rather than duplicating a resubmission', async () => {
    await submit({ score: 5 })
    await submit({ score: 10 })

    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: { score: number }[] }
    expect(entries).toHaveLength(1)
    expect(entries[0].score).toBe(10)
  })

  it('uppercases and trims the submitted name', async () => {
    await submit({ name: '  annie  ' })
    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: { name: string }[] }
    expect(entries[0].name).toBe('ANNIE')
  })

  it('rejects a name over 8 characters', async () => {
    const response = await submit({ name: 'WAYTOOLONG' })
    expect(response.status).toBe(400)
  })

  it('rejects a name with characters outside letters/digits/spaces', async () => {
    const response = await submit({ name: 'AN-NIE' })
    expect(response.status).toBe(400)
  })

  it('rejects a target outside 101-999', async () => {
    expect((await submit({ target: 100 })).status).toBe(400)
    expect((await submit({ target: 1000 })).status).toBe(400)
  })

  it('rejects a score outside the four real bands', async () => {
    expect((await submit({ score: 8 })).status).toBe(400)
  })

  it('rejects a step count above five', async () => {
    expect((await submit({ stepCount: 6 })).status).toBe(400)
  })

  it('rejects a negative duration', async () => {
    expect((await submit({ durationMs: -1 })).status).toBe(400)
  })

  it('accepts a null finalValue (classic clock expired with nothing selected)', async () => {
    const response = await submit({ finalValue: null, score: 0 })
    expect(response.status).toBe(204)
  })

  it('rejects a malformed JSON body', async () => {
    const response = await SELF.fetch('http://example.com/daily-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    })
    expect(response.status).toBe(400)
  })
})

describe('GET /daily-scores/leaderboard', () => {
  it('ranks by score first, so a fast low score never outranks a slow high one', async () => {
    await submit({ deviceId: 'device-slow-high1', score: 10, durationMs: 90_000 })
    await submit({ deviceId: 'device-fast-low2a', score: 5, durationMs: 1_000 })

    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: { score: number }[] }
    expect(entries[0].score).toBe(10)
    expect(entries[1].score).toBe(5)
  })

  it('breaks a tied score by time, fastest first', async () => {
    await submit({ deviceId: 'device-slow-tie1a', name: 'SLOW', score: 7, durationMs: 60_000 })
    await submit({ deviceId: 'device-fast-tie2a', name: 'FAST', score: 7, durationMs: 20_000 })

    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: { name: string }[] }
    expect(entries[0].name).toBe('FAST')
    expect(entries[1].name).toBe('SLOW')
  })

  it('only ever returns the top 10', async () => {
    for (let i = 0; i < 15; i++) {
      await submit({ deviceId: `device-many-${String(i).padStart(3, '0')}`, score: 10, durationMs: 1000 * i })
    }
    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: unknown[] }
    expect(entries).toHaveLength(10)
  })

  it('scopes entries to the exact date requested', async () => {
    await submit({ date: '2026-08-19' })
    await submit({ deviceId: 'device-bbbbbbbb', date: '2026-08-20' })

    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: unknown[] }
    expect(entries).toHaveLength(1)
  })

  it('returns an empty list rather than an error for a day with no scores', async () => {
    const { entries } = (await (await leaderboard('2026-01-01')).json()) as { entries: unknown[] }
    expect(entries).toEqual([])
  })

  it('rejects a missing or malformed date', async () => {
    expect((await SELF.fetch('http://example.com/daily-scores/leaderboard')).status).toBe(400)
  })
})
