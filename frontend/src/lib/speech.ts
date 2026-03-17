import type { SpeechCapability, SpeechPlaybackResult } from '@/types/training'

type SpeechSynthesisWithEvents = SpeechSynthesis & {
  onvoiceschanged: ((this: SpeechSynthesis, ev: Event) => unknown) | null
}

function pickJapaneseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return voices.find((voice) => voice.lang === 'ja-JP') ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('ja-')) ?? null
}

function buildSpeechCapability(voices: SpeechSynthesisVoice[]): SpeechCapability {
  const voiceCount = voices.length
  const hasJapaneseVoice = pickJapaneseVoice(voices) !== null
  const voicesLoaded = voiceCount > 0

  if (hasJapaneseVoice) {
    return {
      status: 'ready',
      hasSynthesis: true,
      voicesLoaded,
      hasJapaneseVoice,
      voiceCount,
      label: '语音已就绪',
      hint: '当前浏览器已检测到日语语音，可以正常进行听写和单词跟读。',
    }
  }

  return {
    status: 'limited',
    hasSynthesis: true,
    voicesLoaded,
    hasJapaneseVoice,
    voiceCount,
    label: voicesLoaded ? '语音受限' : '语音加载中',
    hint: voicesLoaded
      ? '检测到了语音引擎，但没有稳定的日语 voice。你仍可试播，若效果不理想，建议改用 recognition 或补装系统日语语音。'
      : '浏览器支持语音，但 voice 还没完全加载。可稍等片刻重试，或先开始 recognition。',
  }
}

function getLimitedPlaybackMessage(voicesLoaded: boolean): string {
  if (voicesLoaded) {
    return '已尝试播放，但当前缺少稳定的日语 voice，若听不清可先回 recognition。'
  }

  return '已尝试播放，但语音仍在加载中；如果没有声音，请稍等片刻后再试。'
}

function getSpeechSynthesisInstance(): SpeechSynthesisWithEvents | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null
  }

  return window.speechSynthesis as SpeechSynthesisWithEvents
}

export function canSpeakJapanese(): boolean {
  return getSpeechSynthesisInstance() !== null
}

export function getSpeechCapability(): SpeechCapability {
  const synthesis = getSpeechSynthesisInstance()
  if (!synthesis) {
    return {
      status: 'unsupported',
      hasSynthesis: false,
      voicesLoaded: false,
      hasJapaneseVoice: false,
      voiceCount: 0,
      label: '语音不可用',
      hint: '当前浏览器不支持 speechSynthesis，建议先使用 recognition，或换到支持系统语音的浏览器。',
    }
  }

  return buildSpeechCapability(synthesis.getVoices())
}

export function warmJapaneseVoices(): void {
  const synthesis = getSpeechSynthesisInstance()
  if (!synthesis) {
    return
  }

  synthesis.getVoices()
}

export function speakJapanese(text: string): SpeechPlaybackResult {
  const synthesis = getSpeechSynthesisInstance()
  if (!synthesis) {
    return {
      ok: false,
      message: '当前浏览器不支持语音播放，请先使用 recognition 或更换到支持系统语音的浏览器。',
    }
  }

  const voices = synthesis.getVoices()
  const capability = buildSpeechCapability(voices)
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'

  const voice = pickJapaneseVoice(voices)
  if (voice) {
    utterance.voice = voice
  }

  try {
    synthesis.cancel()
    synthesis.speak(utterance)
  } catch {
    return {
      ok: false,
      message: '语音播放没有成功启动，请检查浏览器语音权限或系统语音包后重试。',
    }
  }

  if (capability.status === 'limited') {
    return {
      ok: true,
      message: getLimitedPlaybackMessage(capability.voicesLoaded),
    }
  }

  return {
    ok: true,
    message: '',
  }
}
