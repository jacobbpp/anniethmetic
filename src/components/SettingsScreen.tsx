import { useEffect, useRef, useState } from 'react'
import { ScreenHeader } from './ScreenHeader.tsx'
import { ChevronIcon } from './icons.tsx'

const RESET_CONFIRM_TIMEOUT_MS = 3000

export interface SettingsScreenProps {
  muted: boolean
  onToggleMuted: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  hardMode: boolean
  onToggleHardMode: () => void
  classicClock: boolean
  onToggleClassicClock: () => void
  onOpenHowToPlay: () => void
  onOpenWhatsNew: () => void
  onResetData: () => void
  onClose: () => void
  version: string
}

export function SettingsScreen({
  muted,
  onToggleMuted,
  theme,
  onToggleTheme,
  hardMode,
  onToggleHardMode,
  classicClock,
  onToggleClassicClock,
  onOpenHowToPlay,
  onOpenWhatsNew,
  onResetData,
  onClose,
  version,
}: SettingsScreenProps) {
  const [confirming, setConfirming] = useState(false)
  const confirmTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current !== null) {
        window.clearTimeout(confirmTimeoutRef.current)
      }
    }
  }, [])

  function handleResetClick() {
    if (confirming) {
      if (confirmTimeoutRef.current !== null) {
        window.clearTimeout(confirmTimeoutRef.current)
        confirmTimeoutRef.current = null
      }
      setConfirming(false)
      onResetData()
      return
    }

    setConfirming(true)
    confirmTimeoutRef.current = window.setTimeout(() => {
      setConfirming(false)
      confirmTimeoutRef.current = null
    }, RESET_CONFIRM_TIMEOUT_MS)
  }

  const soundOn = !muted
  const isLight = theme === 'light'

  return (
    <div className="screen">
      <ScreenHeader title="Settings" backLabel="Back to game" onBack={onClose} />
      <div className="screen__body">
        <div className="settings-row">
          <span className="settings-row__label">
            Sound
            <span className={soundOn ? 'settings-row__state settings-row__state--on' : 'settings-row__state'}>
              {soundOn ? 'On' : 'Off'}
            </span>
          </span>
          <button
            type="button"
            className={soundOn ? 'toggle toggle--on' : 'toggle'}
            role="switch"
            aria-checked={soundOn}
            onClick={onToggleMuted}
          >
            <span className="toggle__knob" />
          </button>
        </div>

        <div className="settings-row">
          <span className="settings-row__label">
            Theme
            <span className={isLight ? 'settings-row__state settings-row__state--on' : 'settings-row__state'}>
              {isLight ? 'Light' : 'Dark'}
            </span>
          </span>
          <button
            type="button"
            className={isLight ? 'toggle toggle--on' : 'toggle'}
            role="switch"
            aria-checked={isLight}
            onClick={onToggleTheme}
          >
            <span className="toggle__knob" />
          </button>
        </div>

        <div className="settings-row">
          <span className="settings-row__label">
            Hard mode
            <span className="settings-row__state">Hides the running operations log while you play</span>
          </span>
          <button
            type="button"
            className={hardMode ? 'toggle toggle--on' : 'toggle'}
            role="switch"
            aria-checked={hardMode}
            onClick={onToggleHardMode}
          >
            <span className="toggle__knob" />
          </button>
        </div>

        <div className="settings-row">
          <span className="settings-row__label">
            Classic clock
            <span className="settings-row__state">
              Optional 30-second countdown, a nod to the show, but it doesn't replace daily scoring.
            </span>
          </span>
          <button
            type="button"
            className={classicClock ? 'toggle toggle--on' : 'toggle'}
            role="switch"
            aria-checked={classicClock}
            onClick={onToggleClassicClock}
          >
            <span className="toggle__knob" />
          </button>
        </div>

        <button type="button" className="menu-row" onClick={onOpenHowToPlay}>
          <span className="menu-row-text">
            <span className="menu-row-title">How to play</span>
            <span className="menu-row-preview">Rules, scoring, and a few tips</span>
          </span>
          <ChevronIcon />
        </button>

        <button type="button" className="menu-row" onClick={onOpenWhatsNew}>
          <span className="menu-row-text">
            <span className="menu-row-title">What's new</span>
            <span className="menu-row-preview">Full release history</span>
          </span>
          <ChevronIcon />
        </button>

        <div className="settings-danger">
          <button
            type="button"
            className="btn btn--danger-outline"
            style={{ width: '100%' }}
            onClick={handleResetClick}
          >
            {confirming ? 'Tap again to confirm' : 'Reset all data'}
          </button>
        </div>

        <div className="settings-version">Anniethmetic v{version}</div>
      </div>
    </div>
  )
}
