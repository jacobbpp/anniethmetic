import { useCallback, useState } from 'react'
import { isSoundMuted, setSoundMuted } from '../utils/sound.ts'

export function useSoundSetting(): { muted: boolean; toggleMuted: () => void } {
  const [muted, setMuted] = useState(isSoundMuted)

  const toggleMuted = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      setSoundMuted(next)
      return next
    })
  }, [])

  return { muted, toggleMuted }
}
