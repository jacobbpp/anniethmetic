import { describe, expect, it } from 'vitest'
import { CHANGELOG } from './changelog.ts'
import { APP_VERSION } from '../version.ts'

describe('CHANGELOG', () => {
  it('has at least one entry', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0)
  })

  it('has its newest entry match the current APP_VERSION', () => {
    expect(CHANGELOG[0].version).toBe(APP_VERSION)
  })

  it('lists entries with no duplicate versions', () => {
    const versions = CHANGELOG.map(entry => entry.version)
    expect(new Set(versions).size).toBe(versions.length)
  })

  it('gives every entry at least one highlight', () => {
    CHANGELOG.forEach(entry => {
      expect(entry.highlights.length).toBeGreaterThan(0)
    })
  })
})
