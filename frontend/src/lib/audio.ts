let audioContext: AudioContext | null = null

type WindowWithLegacyAudio = Window & {
  webkitAudioContext?: typeof AudioContext
}

export function getAudioContext() {
  if (typeof window === 'undefined') {
    return null
  }

  if (audioContext) {
    if (audioContext.state === 'suspended') {
      void audioContext.resume()
    }
    return audioContext
  }

  const contextClass = window.AudioContext ?? (window as WindowWithLegacyAudio).webkitAudioContext
  if (!contextClass) {
    return null
  }

  audioContext = new contextClass()
  return audioContext
}

export function playResultSound(ok: boolean) {
  const context = getAudioContext()
  if (!context) {
    return
  }

  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.connect(gain)
  gain.connect(context.destination)

  const startAt = context.currentTime
  oscillator.frequency.setValueAtTime(ok ? 880 : 260, startAt)

  if (ok) {
    oscillator.frequency.linearRampToValueAtTime(1175, startAt + 0.18)
  } else {
    oscillator.frequency.linearRampToValueAtTime(200, startAt + 0.1)
    oscillator.frequency.linearRampToValueAtTime(150, startAt + 0.2)
  }

  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.linearRampToValueAtTime(0.18, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.25)

  oscillator.start(startAt)
  oscillator.stop(startAt + 0.27)
}
