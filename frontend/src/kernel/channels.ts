import type { GradeReason, OnsetSource, ResponseChannel, TrialEvent } from './types'

/**
 * 每个作答通道**在响应侧**分别支撑哪些指标。
 *
 * 这只是 R1 的一半：完整判断还要看刺激 onset 可不可知（metricSupportFor）。
 */
export interface MetricSupport {
  /** 机器判分（true）还是学习者自评（false）。 */
  machineGraded: boolean
  /** 响应侧是否允许测单题反应时间。 */
  reactionTime: boolean
  /** 响应侧是否允许算吞吐量。 */
  throughput: boolean
}

export const METRIC_SUPPORT: Record<ResponseChannel, MetricSupport> = {
  // 延迟只有触摸采样量级（8–30ms），三个指标都成立。
  tap: { machineGraded: true, reactionTime: true, throughput: true },

  // 机器可判分，所以准确率与吞吐可信；但单题 RT 被 IME 机制主导
  // （软键盘弹出、composition、纠错、联想），打出来的那个 ms 测的是输入法不是假名。
  type: { machineGraded: true, reactionTime: false, throughput: true },

  // 没有可靠的自动判分手段（SpeechRecognition 不是 Baseline，
  // Android WebView 支持不完整，Chrome 实现是服务端识别要联网上传音频），
  // 所以准确率是自评的。
  speak: { machineGraded: false, reactionTime: false, throughput: true },
}

export const RESPONSE_CHANNELS: readonly ResponseChannel[] = ['tap', 'type', 'speak']

export const ONSET_SOURCES: readonly OnsetSource[] = [
  'paint',
  'audio-scheduled',
  'audio-unknown',
]

export function isSelfReported(reason: GradeReason): boolean {
  return reason === 'self-pass' || reason === 'self-fail'
}

export function isMachineGradedChannel(channel: ResponseChannel): boolean {
  return METRIC_SUPPORT[channel].machineGraded
}

/**
 * 完整的指标有效性判断：**刺激侧与响应侧都要过关**。
 *
 * 这是把「听写」这类 drill 的诚实边界编码成逻辑的地方：
 * 用 speechSynthesis 出声，onset 不可知 → 速度指标（单题 RT 与吞吐）全部不成立。
 * 其中吞吐不成立的原因值得写清楚：TTS 的启动延迟与音节时长逐条不同，
 * 「个/分」会被音频长度污染，连组间比较都做不了。
 *
 * 换成预渲染音频（`audio-scheduled`）后，同一个 drill 无需改任何其它代码
 * 就能拿回速度指标——这是把「暂时做不到」和「结构上做不到」分开的价值。
 */
export function metricSupportFor(
  channel: ResponseChannel,
  onset: OnsetSource,
): MetricSupport {
  const base = METRIC_SUPPORT[channel]

  if (onset === 'audio-unknown') {
    return { machineGraded: base.machineGraded, reactionTime: false, throughput: false }
  }

  return base
}

/**
 * 一组事件里出现了哪些作答通道。
 *
 * 长度 > 1 意味着这些数字**不可跨通道比较** —— 消费方必须自己决定是分组还是拒绝。
 */
export function channelsPresent(events: readonly TrialEvent[]): ResponseChannel[] {
  const seen = new Set<ResponseChannel>()
  for (const event of events) {
    seen.add(event.channel)
  }

  return RESPONSE_CHANNELS.filter((channel) => seen.has(channel))
}
