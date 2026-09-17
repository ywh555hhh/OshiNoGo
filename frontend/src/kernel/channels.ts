import type { GradeReason, ResponseChannel, TrialEvent } from './types'

/**
 * 每个作答通道分别支撑哪些指标。
 *
 * 这张表是 R1 的可执行形式：作答通道决定这些数字**能和什么比**，
 * 不决定能不能测。写成数据 + 由测试守着，UI 就没法显示一个无效指标。
 */
export interface MetricSupport {
  /** 机器判分（true）还是学习者自评（false）。 */
  machineGraded: boolean
  /** 单题反应时间是否有意义。 */
  reactionTime: boolean
  /** 限时冲刺的吞吐量（个/分）是否有意义。 */
  throughput: boolean
}

export const METRIC_SUPPORT: Record<ResponseChannel, MetricSupport> = {
  // 延迟只有触摸采样量级（8–30ms），三个指标都成立。
  tap: { machineGraded: true, reactionTime: true, throughput: true },

  // 机器可判分，所以准确率与吞吐可信；但单题 RT 被 IME 机制主导
  // （软键盘弹出、composition、纠错、联想），打出来的那个 ms 测的是输入法不是假名。
  // 注意吞吐仍然有效：ICPM 对「每题恒定延迟」只乘一个恒定系数，
  // 通道内的趋势与组间比较因此依然成立。
  type: { machineGraded: true, reactionTime: false, throughput: true },

  // 没有可靠的自动判分手段（SpeechRecognition 不是 Baseline，
  // Android WebView 支持不完整，Chrome 实现是服务端识别要联网上传音频），
  // 所以准确率是自评的。自评吞吐也有意义，但要清楚它是自评。
  speak: { machineGraded: false, reactionTime: false, throughput: true },
}

export const RESPONSE_CHANNELS: readonly ResponseChannel[] = ['tap', 'type', 'speak']

export function isSelfReported(reason: GradeReason): boolean {
  return reason === 'self-pass' || reason === 'self-fail'
}

export function isMachineGradedChannel(channel: ResponseChannel): boolean {
  return METRIC_SUPPORT[channel].machineGraded
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
