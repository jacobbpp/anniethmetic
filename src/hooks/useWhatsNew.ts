import { useCallback, useState } from 'react'
import { CHANGELOG } from '../game/changelog.ts'
import type { ChangelogEntry } from '../game/changelog.ts'
import { APP_VERSION } from '../version.ts'

const STORAGE_KEY = 'anniethmetic-last-seen-version'

function readLastSeenVersion(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeLastSeenVersion(version: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, version)
  } catch {
    // storage unavailable; the prompt may just reappear next visit
  }
}

// Entries strictly newer than `version`, newest first. Returns everything
// if `version` isn't recognized (an old build, or a corrupted save) — safer
// to skip the catch-up prompt entirely than to guess how far back it goes.
function entriesSince(version: string): ChangelogEntry[] {
  const seenIndex = CHANGELOG.findIndex(entry => entry.version === version)
  if (seenIndex === -1) return []
  return CHANGELOG.slice(0, seenIndex)
}

interface WhatsNewState {
  isOpen: boolean
  entries: ChangelogEntry[]
}

// A brand-new install has nothing to catch up on (just silently records the
// current version), while a returning device on an older version gets shown
// everything it missed. Runs once, during the initial render, the same way
// useAchievements seeds its own localStorage-backed state.
function computeInitialState(): WhatsNewState {
  const lastSeen = readLastSeenVersion()
  if (lastSeen === null) {
    writeLastSeenVersion(APP_VERSION)
    return { isOpen: false, entries: [] }
  }
  if (lastSeen === APP_VERSION) return { isOpen: false, entries: [] }

  const delta = entriesSince(lastSeen)
  if (delta.length === 0) {
    writeLastSeenVersion(APP_VERSION)
    return { isOpen: false, entries: [] }
  }
  return { isOpen: true, entries: delta }
}

export interface UseWhatsNewResult {
  isOpen: boolean
  entries: ChangelogEntry[]
  close: () => void
  openFullHistory: () => void
}

export function useWhatsNew(): UseWhatsNewResult {
  const [{ isOpen, entries }, setState] = useState(computeInitialState)

  const close = useCallback(() => {
    writeLastSeenVersion(APP_VERSION)
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const openFullHistory = useCallback(() => {
    setState({ isOpen: true, entries: CHANGELOG })
  }, [])

  return { isOpen, entries, close, openFullHistory }
}
