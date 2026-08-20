const STORAGE_KEY = 'anniethmetic-sound-muted'

function readMuted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeMuted(value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // storage unavailable; the toggle just won't persist across sessions
  }
}

export function isSoundMuted(): boolean {
  return readMuted()
}

export function setSoundMuted(value: boolean): void {
  writeMuted(value)
}

export type SoundName = 'select' | 'merge' | 'win' | 'close' | 'miss'

interface Tone {
  frequency: number
  duration: number
}

const TONES: Record<SoundName, Tone[]> = {
  select: [{ frequency: 520, duration: 0.05 }],
  merge: [{ frequency: 660, duration: 0.08 }],
  win: [
    { frequency: 660, duration: 0.09 },
    { frequency: 880, duration: 0.14 },
  ],
  close: [{ frequency: 587, duration: 0.12 }],
  miss: [{ frequency: 220, duration: 0.18 }],
}

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextCtor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  audioContext ??= new AudioContextCtor()
  return audioContext
}

// A handful of short synthesized tones so the app needs no audio asset
// files of its own — fine for a small set of UI cues like this.
export function playSound(name: SoundName): void {
  if (isSoundMuted()) return
  const ctx = getAudioContext()
  if (!ctx) return

  let startAt = ctx.currentTime
  for (const { frequency, duration } of TONES[name]) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + duration + 0.02)
    startAt += duration
  }
}
