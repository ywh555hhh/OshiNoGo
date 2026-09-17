/**
 * 参考音（朗读示范）。
 *
 * 这里用的是 speechSynthesis，而 R1 禁止把它放进任何**计时路径**。
 * 两者并不矛盾：speak 通道不产生任何速度指标（`METRIC_SUPPORT.speak.reactionTime`
 * 是 false），所以「onset 不可知」这个否决条件在这里不适用——我们只需要它响，
 * 不需要知道它何时响。
 *
 * tap / type 通道**绝不能**调用这个函数。
 *
 * 必须在用户手势里调用（iOS 需要手势解锁音频）；调用方负责这一点。
 */
export function speakReference(text: string): 'ok' | 'unsupported' {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return 'unsupported'
  }

  const synthesis = window.speechSynthesis
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 0.9

  const voice =
    synthesis.getVoices().find((candidate) => candidate.lang === 'ja-JP') ??
    synthesis.getVoices().find((candidate) => candidate.lang.toLowerCase().startsWith('ja-'))

  if (voice) {
    utterance.voice = voice
  }

  try {
    synthesis.cancel()
    synthesis.speak(utterance)
    return 'ok'
  } catch {
    return 'unsupported'
  }
}
