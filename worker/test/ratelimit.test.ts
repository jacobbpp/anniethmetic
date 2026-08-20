import { env, SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { allowWrite } from '../src/index'

const LIMIT = 60
const WINDOW_MS = 60_000
const T0 = 1_800_000_000_000

// Drives the object directly so the window can be moved without waiting a
// real minute.
function limiterFor(key: string) {
  return env.RATE_LIMITER.getByName(key)
}

function writeRequest(ip = '203.0.113.10') {
  return new Request('http://example.com/streaks', { method: 'POST', headers: { 'CF-Connecting-IP': ip } })
}

describe('the counter itself', () => {
  it('allows everything up to the limit and refuses the next one', async () => {
    const limiter = limiterFor('counter-basic')

    for (let i = 1; i <= LIMIT; i++) {
      expect(await limiter.consume(T0)).toBe(true)
    }
    expect(await limiter.consume(T0)).toBe(false)
  })

  it('keeps refusing for the rest of the window', async () => {
    const limiter = limiterFor('counter-stays-shut')
    for (let i = 0; i <= LIMIT; i++) await limiter.consume(T0)

    expect(await limiter.consume(T0 + WINDOW_MS - 1)).toBe(false)
  })

  it('starts fresh once the window has passed', async () => {
    const limiter = limiterFor('counter-resets')
    for (let i = 0; i <= LIMIT; i++) await limiter.consume(T0)
    expect(await limiter.consume(T0)).toBe(false)

    expect(await limiter.consume(T0 + WINDOW_MS)).toBe(true)
  })
})

describe('who gets counted together', () => {
  it('counts each key separately, so one person cannot use up another\'s', async () => {
    const busy = limiterFor('device:busy-one')
    for (let i = 0; i <= LIMIT; i++) await busy.consume(T0)
    expect(await busy.consume(T0)).toBe(false)

    expect(await limiterFor('device:quiet-one').consume(T0)).toBe(true)
  })

  it('keys on the device when there is one', async () => {
    const request = writeRequest()

    for (let i = 0; i < LIMIT; i++) {
      expect(await allowWrite(request, env, 'device-aaa')).toBe(true)
    }
    expect(await allowWrite(request, env, 'device-aaa')).toBe(false)
    // Same address, different person: unaffected.
    expect(await allowWrite(request, env, 'device-bbb')).toBe(true)
  })

  it('falls back to the address only when there is no device', async () => {
    const request = writeRequest('198.51.100.42')

    for (let i = 0; i < LIMIT; i++) {
      expect(await allowWrite(request, env)).toBe(true)
    }
    expect(await allowWrite(request, env)).toBe(false)
    expect(await allowWrite(writeRequest('198.51.100.43'), env)).toBe(true)
  })
})

describe('when the limiter is unhappy', () => {
  it('lets the write through rather than failing it', async () => {
    const broken = {
      ...env,
      RATE_LIMITER: {
        getByName() {
          throw new Error('limiter unavailable')
        },
      },
    } as unknown as Parameters<typeof allowWrite>[1]

    expect(await allowWrite(writeRequest(), broken, 'device-aaa')).toBe(true)
  })
})

describe('through the real endpoints', () => {
  it('refuses a write once that device has had its allowance', async () => {
    const deviceId = 'flood-device-aaaaaa'
    const submitBody = {
      deviceId,
      name: 'FLOOD',
      streakCount: 1,
      lastPlayedDate: '2026-08-20',
    }

    const post = () =>
      SELF.fetch('http://example.com/streaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitBody),
      })

    const codes: number[] = []
    for (let i = 0; i < LIMIT + 5; i++) codes.push((await post()).status)

    expect(codes.filter(code => code === 204)).toHaveLength(LIMIT)
    expect(codes.filter(code => code === 429)).toHaveLength(5)
  })

  it('leaves reads alone, so nothing gets slower or cut off', async () => {
    for (let i = 0; i < LIMIT + 10; i++) {
      expect((await SELF.fetch('http://example.com/streaks/leaderboard?today=2026-08-20')).status).toBe(200)
    }
  })
})
