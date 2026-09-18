/**
 * 正误音效。
 *
 * 用 WebAudio 现场合成两个音，不需要任何音频资源。
 *
 * 注意：`AudioContext` 初始是 suspended，`resume()` 必须在用户手势里调用
 * （微信 / iOS 都会拦）。这里是尽力而为：拿不到声音就静默跳过，
 * 视觉反馈（全屏回闪 + 回执）始终在，不依赖音频。
 */

let context: AudioContext | null = null

type LegacyWindow = Window & { webkitAudioContext?: typeof AudioContext }

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (context) {
    if (context.state === 'suspended') {
      void context.resume()
    }
    return context
  }

  const ContextClass = window.AudioContext ?? (window as LegacyWindow).webkitAudioContext
  if (!ContextClass) {
    return null
  }

  try {
    context = new ContextClass()
    return context
  } catch {
    return null
  }
}

export function playResultSound(ok: boolean): void {
  const audio = getContext()
  if (!audio) {
    return
  }

  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.connect(gain)
  gain.connect(audio.destination)

  const startAt = audio.currentTime
  // 答对往上走（更像「完成」），答错往下沉（更像「没中」）
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
