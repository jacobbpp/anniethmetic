const KEY_PREFIX = 'anniethmetic-'

export function resetAllData(): void {
  if (typeof window === 'undefined') return
  try {
    const keys = Object.keys(window.localStorage).filter(key => key.startsWith(KEY_PREFIX))
    keys.forEach(key => window.localStorage.removeItem(key))
  } catch {
    // storage unavailable; nothing to clear
  }
  window.location.reload()
}
