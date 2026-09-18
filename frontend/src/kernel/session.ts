import { buildChoiceSet, type Choice, type ChoiceSource } from './choices'
import { metricSupportFor, type MetricSupport } from './channels'
import { buildAnswerIndex, grade, type AnswerIndex, type AnswerKeySource } from './grading'
import type { ItemPrior } from './history'
import { summarize, type TrialMetrics } from './metrics'
import { pickNext, type ScheduleConfig } from './schedule'
import type { GradeReason, Item, Modality, OnsetSource, ResponseChannel, TrialEvent } from './types'

/**
 * 一个 drill 的全部领域知识都在这里，而且只有这些。
 * kernel 本身不知道「假名」是什么。
 */
export interface DrillSpec extends AnswerKeySource, ChoiceSource {
  id: string
  modality: Modality
  /**
   * 刺激 onset 的来源。
   *
   * 和 `channel` 一起决定速度指标成不成立：**刺激侧与响应侧都要过关**。
   * 这就是「用 TTS 出声的听写只能是练习、不能是测量」的编码位置。
   */
  onset: OnsetSource
  /** 这个 drill 的作答通道。 */
  channel: ResponseChannel
  /**
   * 选项总数（含正确项）。**只对 tap 通道有意义**。
   * 固定 N 才能让 RT 跨池可比：Hick's law 的 `log₂(n)` 项被消掉后，
   * 5 项母音池和 46 项清音池的反应时间终于是同一个物理量。
   */
  choiceSize: number
}

export interface SessionConfig {
  pool: readonly Item[]
  spec: DrillSpec
  schedule: ScheduleConfig
  /** 冲刺时长（ms）；null = 无时限。 */
  durationMs: number | null
  /** trial 上限；null = 无上限。 */
  trialCap: number | null
  seed: number
  /** 跨场次逐项历史，用于让调度器学到「你弱在哪」。 */
  prior?: ReadonlyMap<string, ItemPrior>
}

export interface SessionState {
  phase: 'idle' | 'awaiting' | 'finished'
  current: Item | null
  /** tap 通道才有内容；其它通道为空数组。 */
  options: Choice[]
  /** 刺激真正上屏的时刻（双 rAF 之后）。null 表示还不能开始计时。 */
  currentOnset: number | null
  startedAt: number | null
  endedAt: number | null
  events: TrialEvent[]
  /** PRNG 状态放在 state 里，因此整场训练可序列化、可重放。 */
  rngState: number
}

export type SessionEvent =
  | { type: 'start'; at: number }
  | { type: 'present'; at: number }
  /** tap 通道：点选了某个选项。 */
  | { type: 'choose'; at: number; choiceId: string }
  /** type 通道：提交了一段文本，由 grader 判分。 */
  | { type: 'submitText'; at: number; text: string }
  /** speak 通道：学习者自己判对错。 */
  | { type: 'selfReport'; at: number; ok: boolean }
  | { type: 'skip'; at: number }
  | { type: 'stop'; at: number }

/** 事件类型与作答通道的对应关系。用来拒绝"通道不匹配"的事件。 */
const EVENT_CHANNEL: Record<'choose' | 'submitText' | 'selfReport', ResponseChannel> = {
  choose: 'tap',
  submitText: 'type',
  selfReport: 'speak',
}

export function createSession(config: SessionConfig): SessionState {
  return {
    phase: 'idle',
    current: null,
    options: [],
    currentOnset: null,
    startedAt: null,
    endedAt: null,
    events: [],
    rngState: config.seed | 0,
  }
}

export function createAnswerIndex(config: SessionConfig): AnswerIndex {
  return buildAnswerIndex(config.pool, config.spec)
}

function assertNever(value: never): never {
  throw new Error(`未处理的 session 事件: ${JSON.stringify(value)}`)
}

/**
 * 纯状态机。没有副作用、没有闭包捕获、没有 React、没有 DOM。
 * 因此整场训练可以被合成序列重放测试。
 */
export function step(
  state: SessionState,
  event: SessionEvent,
  config: SessionConfig,
  index: AnswerIndex,
): SessionState {
  switch (event.type) {
    case 'start':
      return beginTrial(
        {
          ...state,
          phase: 'awaiting',
          current: null,
          options: [],
          currentOnset: null,
          startedAt: event.at,
          endedAt: null,
          events: [],
          rngState: config.seed | 0,
        },
        event.at,
        config,
        index,
      )

    case 'present': {
      // 起表时刻由「渲染完成」事件决定，不由 state 变更决定。
      // 这就是修复「React 重渲染导致计时起点漂移」的地方。
      if (state.phase !== 'awaiting' || !state.current) {
        return state
      }
      return { ...state, currentOnset: event.at }
    }

    case 'choose':
    case 'submitText':
    case 'selfReport': {
      // 通道不匹配的事件直接拒绝：drill 声明了自己的通道，
      // 收到别的通道的作答一定是编程错误，不能悄悄记进日志。
      if (EVENT_CHANNEL[event.type] !== config.spec.channel) {
        return state
      }

      // 尚未上屏就作答：不接受、不记录。宁可丢一次点击，不污染 RT 数据。
      if (state.phase !== 'awaiting' || !state.current || state.currentOnset === null) {
        return state
      }

      const graded = gradeResponse(state, event, config, index)
      if (!graded) {
        return state
      }

      return advance(
        appendEvent(state, {
          itemId: state.current.id,
          tOnset: state.currentOnset,
          tResponse: event.at,
          response: graded.response,
          ok: graded.ok,
          reason: graded.reason,
          channel: config.spec.channel,
        }),
        event.at,
        config,
        index,
      )
    }

    case 'skip':
      return skipTrial(state, event.at, config, index, 'skipped')

    case 'stop':
      return state.phase === 'finished' ? state : finish(state, event.at)

    default:
      return assertNever(event)
  }
}

interface GradedResponse {
  response: string | null
  ok: boolean
  reason: GradeReason
}

function gradeResponse(
  state: SessionState,
  event: Extract<SessionEvent, { type: 'choose' | 'submitText' | 'selfReport' }>,
  config: SessionConfig,
  index: AnswerIndex,
): GradedResponse | null {
  const item = state.current
  if (!item) {
    return null
  }

  if (event.type === 'selfReport') {
    return {
      response: null,
      ok: event.ok,
      reason: event.ok ? 'self-pass' : 'self-fail',
    }
  }

  const text =
    event.type === 'choose'
      ? state.options.find((option) => option.id === event.choiceId)?.label
      : event.text

  if (text === undefined) {
    return null
  }

  // 判分只有唯一权威：grade()。tap 与 type 走的是同一段判分代码，
  // 所以「点对了算对」和「打对了算对」不可能出现分叉。
  const result = grade({ item, index, source: config.spec, response: text })

  // 空提交不是一次作答：不记录、也不推进。
  // UI 也会拦（提交前 trim），但 kernel 不能依赖 UI 拦——否则按一个空格
  // 就能静静吃掉一道题，而且日志里会多出一条谁也不认识的 empty 记录。
  if (result.reason === 'empty') {
    return null
  }

  return { response: text, ok: result.ok, reason: result.reason }
}

function skipTrial(
  state: SessionState,
  at: number,
  config: SessionConfig,
  index: AnswerIndex,
  reason: 'skipped' | 'timeout',
): SessionState {
  if (state.phase !== 'awaiting' || !state.current) {
    return state
  }

  return advance(
    appendEvent(state, {
      itemId: state.current.id,
      tOnset: state.currentOnset ?? at,
      tResponse: null,
      response: null,
      ok: false,
      reason,
      channel: config.spec.channel,
    }),
    at,
    config,
    index,
  )
}

function appendEvent(state: SessionState, event: TrialEvent): SessionState {
  return { ...state, events: [...state.events, event] }
}

function advance(
  state: SessionState,
  at: number,
  config: SessionConfig,
  index: AnswerIndex,
): SessionState {
  if (config.trialCap !== null && state.events.length >= config.trialCap) {
    return finish(state, at)
  }

  // 冲刺在「飞行中的那一题答完之后」才结束，不切断用户正在做的题。
  if (
    config.durationMs !== null &&
    state.startedAt !== null &&
    at - state.startedAt >= config.durationMs
  ) {
    return finish(state, at)
  }

  return beginTrial(state, at, config, index)
}

function beginTrial(
  state: SessionState,
  at: number,
  config: SessionConfig,
  index: AnswerIndex,
): SessionState {
  const pick = pickNext({
    pool: config.pool,
    events: state.events,
    config: config.schedule,
    rngState: state.rngState,
    prior: config.prior,
  })

  if (!pick) {
    return finish(state, at)
  }

  // 只有 tap 通道需要选项集。别的通道不构建选项，
  // 于是「点选一个不存在的按钮」这类路径根本不存在。
  if (config.spec.channel !== 'tap') {
    return {
      ...state,
      phase: 'awaiting',
      current: pick.item,
      options: [],
      currentOnset: null,
      rngState: pick.rngState,
    }
  }

  const choiceSet = buildChoiceSet({
    target: pick.item,
    pool: config.pool,
    source: config.spec,
    index,
    size: config.spec.choiceSize,
    rngState: pick.rngState,
  })

  return {
    ...state,
    phase: 'awaiting',
    current: pick.item,
    options: choiceSet.options,
    currentOnset: null,
    rngState: choiceSet.rngState,
  }
}

function finish(state: SessionState, at: number): SessionState {
  return {
    ...state,
    phase: 'finished',
    current: null,
    options: [],
    currentOnset: null,
    endedAt: at,
  }
}

export interface SessionSummary extends TrialMetrics {
  elapsedMs: number
  finished: boolean
  channel: ResponseChannel
  onset: OnsetSource
  /** 这个 drill 实际支撑哪些指标。UI 从它决定显示什么，而不是自己判断。 */
  support: MetricSupport
}

export function deriveSummary(
  state: SessionState,
  now: number,
  config: SessionConfig,
): SessionSummary {
  const elapsedMs =
    state.startedAt !== null ? Math.max(0, (state.endedAt ?? now) - state.startedAt) : 0

  // 有时限的冲刺用真实墙钟（走神就该拉低 ICPM）；
  // 无时限则退回「首末作答之差」，因为墙上时间包含休息，不是训练时间。
  const metrics = summarize(state.events, {
    durationMs: config.durationMs !== null ? elapsedMs : null,
    channel: config.spec.channel,
  })

  const support = metricSupportFor(config.spec.channel, config.spec.onset)

  // 无效的指标在这里就被抹平：UI 拿不到一个不该存在的数字，
  // 所以「给 onset 不可知的听写显示毫秒或个/分」在结构上做不到。
  return {
    ...metrics,
    medianRt: support.reactionTime ? metrics.medianRt : null,
    cv: support.reactionTime ? metrics.cv : null,
    icpm: support.throughput ? metrics.icpm : 0,
    elapsedMs,
    finished: state.phase === 'finished',
    channel: config.spec.channel,
    onset: config.spec.onset,
    support,
  }
}
