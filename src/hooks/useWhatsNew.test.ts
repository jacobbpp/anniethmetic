import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useWhatsNew } from './useWhatsNew.ts'
import { CHANGELOG } from '../game/changelog.ts'
import { APP_VERSION } from '../version.ts'

const STORAGE_KEY = 'anniethmetic-last-seen-version'

afterEach(() => {
  localStorage.clear()
})

describe('useWhatsNew', () => {
  it('does not auto-open for a brand-new install, and silently records the current version', () => {
    const { result } = renderHook(() => useWhatsNew())

    expect(result.current.isOpen).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(APP_VERSION)
  })

  it('auto-opens with everything newer than the last-seen version for a returning device', () => {
    const olderVersion = CHANGELOG[CHANGELOG.length - 1].version
    localStorage.setItem(STORAGE_KEY, olderVersion)

    const { result } = renderHook(() => useWhatsNew())

    expect(result.current.isOpen).toBe(true)
    expect(result.current.entries).toEqual(CHANGELOG.slice(0, CHANGELOG.length - 1))
  })

  it('does not auto-open when the last-seen version is already current', () => {
    localStorage.setItem(STORAGE_KEY, APP_VERSION)

    const { result } = renderHook(() => useWhatsNew())

    expect(result.current.isOpen).toBe(false)
  })

  it('does not auto-open, but resets storage, for an unrecognized last-seen version', () => {
    localStorage.setItem(STORAGE_KEY, '999.0.0')

    const { result } = renderHook(() => useWhatsNew())

    expect(result.current.isOpen).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(APP_VERSION)
  })

  it('close() dismisses the prompt and records the current version as seen', () => {
    localStorage.setItem(STORAGE_KEY, CHANGELOG[CHANGELOG.length - 1].version)
    const { result } = renderHook(() => useWhatsNew())
    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.close()
    })

    expect(result.current.isOpen).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(APP_VERSION)
  })

  it('openFullHistory() opens the complete changelog even when already up to date', () => {
    localStorage.setItem(STORAGE_KEY, APP_VERSION)
    const { result } = renderHook(() => useWhatsNew())
    expect(result.current.isOpen).toBe(false)

    act(() => {
      result.current.openFullHistory()
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.entries).toEqual(CHANGELOG)
  })
})
