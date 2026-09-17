import { buildChoiceSet, type Choice, type ChoiceSource } from './choices'
import {
  buildAnswerIndex,
  grade,
  type AnswerIndex,
  type AnswerKeySource,
} from './grading'
import { summarize, type TrialMetrics } from './metrics'
import { pickNext, type ScheduleConfig } from './schedule'
import type { Item, Modality, TrialEvent } from './types'

/**
 * 一个 drill 的全部领域知识都在这里，而且只有这些。
 * kernel 本身不知道「假名」是什么。
 */
export interface DrillSpec extends AnswerKeySource, ChoiceSource {
  id: string
  modality: Modality
  /**
   * 选项总数（含正确项）。
   * **固定 N 才能让 RT 跨池可比**：Hick's law 的 `log₂(n)` 项被消掉后，
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
}

export interface SessionState {
  phase: 'idle' | 'awaiting' | 'finished'
  current: Item | null
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
  | { type: 'choose'; at: number; choiceId: string }
  | { type: 'skip'; at: number }
  | { type: 'stop'; at: number }

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

    case 'choose': {
      // 尚未上屏就作答：不接受、不记录。宁可丢一次点击，不污染 RT 数据。
      if (state.phase !== 'awaiting' || !state.current || state.currentOnset === null) {
        return state
      }

      const choice = state.options.find((option) => option.id === event.choiceId)
      if (!choice) {
        return state
      }

      const item = state.current
      // 判分只有唯一权威：grade()。选项上的 correct 标记由测试保证与之一致。
      const result = grade({ item, index, source: config.spec, response: choice.label })

      return advance(
        appendEvent(state, {
          itemId: item.id,
          tOnset: state.currentOnset,
          tResponse: event.at,
          response: choice.label,
          ok: result.ok,
          reason: result.reason,
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
  })

  if (!pick) {
    return finish(state, at)
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
  })

  return { ...metrics, elapsedMs, finished: state.phase === 'finished' }
}
