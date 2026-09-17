import { channelsPresent, isSelfReported } from './channels'
import type { ResponseChannel, TrialEvent } from './types'

/** 低于此值的 RT 视为抢答，不是真实作答。 */
export const ANTICIPATION_MS = 150
/** 高于此值的 RT 视为走神/离开，不是真实作答。 */
export const IDLE_MS = 5000
/** 少于此 trial 数的统计不足以支撑任何趋势结论。 */
export const MIN_TRIALS_FOR_TREND = 30

export function median(values: readonly number[]): number | null {
  if (!values.length) {
    return null
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = sorted.length >> 1

  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

export function mean(values: readonly number[]): number {
  if (!values.length) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** 总体标准差（与 Segalowitz 的 CV 定义一致）。样本 < 2 时无意义。 */
export function stdev(values: readonly number[]): number {
  if (values.length < 2) {
    return 0
  }

  const average = mean(values)
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length

  return Math.sqrt(variance)
}

/**
 * 变异系数 = sd / mean。
 *
 * 「变快」（speedup）表现为 mean 与 sd 成比例下降，CV 不变；
 * 「自动化」（automatization）表现为 sd 下降得比 mean 快，CV 下降。
 * 因此 CV 是唯一能把两者分开的指标。
 */
export function coefficientOfVariation(values: readonly number[]): number | null {
  if (values.length < 2) {
    return null
  }

  const average = mean(values)
  if (average <= 0) {
    return null
  }

  return stdev(values) / average
}

export function toIcpm(correct: number, durationMs: number): number {
  if (durationMs <= 0 || correct <= 0) {
    return 0
  }

  return correct / (durationMs / 60_000)
}

export interface ChannelTally {
  channel: ResponseChannel
  attempts: number
  correct: number
  /** 该通道是否自评（自评准确率必须向用户明示）。 */
  selfReported: boolean
}

export interface TrialMetrics {
  attempts: number
  correct: number
  accuracy: number
  /** 准确率是否来自自评。为 true 时 UI 必须标注，不能当作机器判分。 */
  accuracyIsSelfReported: boolean
  /** 只统计机器判分且正确、且在合理区间的 trial。 */
  medianRt: number | null
  /** 只统计产生 medianRt 的那批样本。 */
  cv: number | null
  icpm: number
  /** 被排除的样本数，透明可见，不静默丢弃。 */
  excluded: {
    anticipation: number
    idle: number
    unanswered: number
    /** 因自评而无速度意义的样本。 */
    selfReported: number
  }
  /** trial 数是否足以支撑结论。不足时 UI 必须显示「样本不足」。 */
  sufficient: boolean
  /** 输入里出现过的通道，含各自的计数。 */
  channels: ChannelTally[]
  /**
   * 输入里混了多种作答通道。
   *
   * 为 true 时，accuracy / icpm / medianRt 是跨通道混合的结果，
   * **不可跨通道比较** —— 消费方必须分组或拒绝，不能当成一个数来解读。
   */
  mixedChannels: boolean
}

export interface SummarizeOptions {
  /** 冲刺时长。为 null 时用首末 onset 之差推断。 */
  durationMs?: number | null
  /** 只看某一个通道。给了就同时消除了 mixedChannels 的风险。 */
  channel?: ResponseChannel
}

/**
 * 从事件日志导出指标。纯函数，可对合成序列重放测试。
 *
 * 通道处理是这个函数的核心职责之一：
 * - 自评 trial 计入准确率，但**不进 RT 统计**（没有机器可信的响应区间），
 *   并且会被单独计数，让 UI 无法把它伪装成机器判分。
 * - 出现多种通道时置 `mixedChannels`，把「不可比」这件事变成可检测的信号。
 */
export function summarize(
  events: readonly TrialEvent[],
  options: SummarizeOptions = {},
): TrialMetrics {
  const scoped = options.channel
    ? events.filter((event) => event.channel === options.channel)
    : events

  const tallies = new Map<ResponseChannel, ChannelTally>()

  let attempts = 0
  let correct = 0
  let anticipation = 0
  let idle = 0
  let unanswered = 0
  let selfReported = 0
  const correctRt: number[] = []

  for (const event of scoped) {
    if (event.reason === 'empty') {
      continue
    }

    attempts += 1
    if (event.ok) {
      correct += 1
    }

    let tally = tallies.get(event.channel)
    if (!tally) {
      tally = { channel: event.channel, attempts: 0, correct: 0, selfReported: false }
      tallies.set(event.channel, tally)
    }
    tally.attempts += 1
    if (event.ok) {
      tally.correct += 1
    }
    if (isSelfReported(event.reason)) {
      tally.selfReported = true
    }

    if (event.tResponse === null) {
      unanswered += 1
      continue
    }

    // 自评没有机器可信的响应区间，绝不进速度统计。
    if (isSelfReported(event.reason)) {
      selfReported += 1
      continue
    }

    const rt = event.tResponse - event.tOnset

    if (rt < ANTICIPATION_MS) {
      anticipation += 1
      continue
    }

    if (rt > IDLE_MS) {
      idle += 1
      continue
    }

    // 速度指标只取正确 trial：错误 trial 的 RT 混入会让指标失去意义
    // （答错往往更快，因为它根本不是一次成功检索）。
    if (event.ok) {
      correctRt.push(rt)
    }
  }

  const durationMs = options.durationMs ?? inferDuration(scoped)

  const channels = [...tallies.values()].sort(
    (left, right) => right.attempts - left.attempts,
  )

  return {
    attempts,
    correct,
    accuracy: attempts ? (correct / attempts) * 100 : 0,
    accuracyIsSelfReported: channels.length > 0 && channels.every((tally) => tally.selfReported),
    medianRt: median(correctRt),
    cv: coefficientOfVariation(correctRt),
    icpm: toIcpm(correct, durationMs),
    excluded: { anticipation, idle, unanswered, selfReported },
    sufficient: attempts >= MIN_TRIALS_FOR_TREND,
    channels,
    mixedChannels: channelsPresent(scoped).length > 1,
  }
}

function inferDuration(events: readonly TrialEvent[]): number {
  const answered = events.filter((event) => event.tResponse !== null)
  if (answered.length < 2) {
    return 0
  }

  const first = Math.min(...answered.map((event) => event.tOnset))
  const last = Math.max(...answered.map((event) => event.tResponse as number))

  return Math.max(0, last - first)
}

/**
 * Celeration：两个时间窗之间 ICPM 的每周变化倍数。
 * precision teaching 用它看「学习速率」，而不是只看当前水平。
 */
export function celeration(
  earlierIcpm: number,
  laterIcpm: number,
  elapsedDays: number,
): number | null {
  if (earlierIcpm <= 0 || laterIcpm <= 0 || elapsedDays <= 0) {
    return null
  }

  return (laterIcpm / earlierIcpm) ** (7 / elapsedDays)
}
