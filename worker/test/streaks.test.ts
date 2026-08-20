import { env, SELF } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { yesterday } from '../src/index'

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM streaks').run()
})

interface SubmitBody {
  deviceId: string
  name: string
  streakCount: number
  lastPlayedDate: string
}

function submit(overrides: Partial<SubmitBody> = {}) {
  const submitBody: SubmitBody = {
    deviceId: 'device-aaaaaaaa',
    name: 'ANNIE',
    streakCount: 3,
    lastPlayedDate: '2026-08-20',
    ...overrides,
  }
  return SELF.fetch('http://example.com/streaks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submitBody),
  })
}

function leaderboard(today: string) {
  return SELF.fetch(`http://example.com/streaks/leaderboard?today=${today}`)
}

describe('yesterday', () => {
  it('steps back one calendar day', () => {
    expect(yesterday('2026-08-20')).toBe('2026-08-19')
  })

  it('crosses a month boundary', () => {
    expect(yesterday('2026-09-01')).toBe('2026-08-31')
  })

  it('crosses a year boundary', () => {
    expect(yesterday('2026-01-01')).toBe('2025-12-31')
  })
})

describe('POST /streaks', () => {
  it('accepts a valid submission', async () => {
    expect((await submit()).status).toBe(204)
  })

  it('upserts on device id rather than accumulating history', async () => {
    await submit({ streakCount: 3 })
    await submit({ streakCount: 4 })

    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: { streakCount: number }[] }
    expect(entries).toHaveLength(1)
    expect(entries[0].streakCount).toBe(4)
  })

  it('rejects a streak count below 1', async () => {
    expect((await submit({ streakCount: 0 })).status).toBe(400)
  })

  it('rejects an invalid device id', async () => {
    expect((await submit({ deviceId: 'short' })).status).toBe(400)
  })

  it('rejects a malformed lastPlayedDate', async () => {
    expect((await submit({ lastPlayedDate: 'not-a-date' })).status).toBe(400)
  })
})

describe('GET /streaks/leaderboard', () => {
  it('ranks by streak count, highest first', async () => {
    await submit({ deviceId: 'device-lowa', name: 'LOW', streakCount: 2 })
    await submit({ deviceId: 'device-higha', name: 'HIGH', streakCount: 9 })

    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: { name: string }[] }
    expect(entries[0].name).toBe('HIGH')
    expect(entries[1].name).toBe('LOW')
  })

  it('includes a streak last played today', async () => {
    await submit({ lastPlayedDate: '2026-08-20' })
    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: unknown[] }
    expect(entries).toHaveLength(1)
  })

  it('includes a streak last played yesterday, still counted as active', async () => {
    await submit({ lastPlayedDate: '2026-08-19' })
    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: unknown[] }
    expect(entries).toHaveLength(1)
  })

  it('excludes a streak that lapsed further back than yesterday', async () => {
    await submit({ lastPlayedDate: '2026-08-10' })
    const { entries } = (await (await leaderboard('2026-08-20')).json()) as { entries: unknown[] }
    expect(entries).toHaveLength(0)
  })

  it('rejects a missing or malformed today', async () => {
    expect((await SELF.fetch('http://example.com/streaks/leaderboard')).status).toBe(400)
  })
})
