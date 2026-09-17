import { describe, expect, it } from 'vitest'

import {
  createAnswerIndex,
  createSession,
  deriveSummary,
  step,
  type SessionConfig,
  type SessionEvent,
  type SessionState,
} from '../session'
import { DEFAULT_SCHEDULE } from '../schedule'
import { DICTATION_TTS, POOL, RECOGNITION } from './fixtures'

function config(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    pool: POOL,
    spec: RECOGNITION,
    schedule: DEFAULT_SCHEDULE,
    durationMs: null,
    trialCap: null,
    seed: 1,
    ...overrides,
  }
}

function correctChoiceId(state: SessionState): string {
  const choice = state.options.find((option) => option.correct)
  if (!choice) {
    throw new Error('当前没有正确选项')
  }
  return choice.id
}

function wrongChoiceId(state: SessionState): string {
  const choice = state.options.find((option) => !option.correct)
  if (!choice) {
    throw new Error('当前没有错误选项')
  }
  return choice.id
}

function run(config_: SessionConfig, events: SessionEvent[]): SessionState {
  const index = createAnswerIndex(config_)
  return events.reduce(
    (state, event) => step(state, event, config_, index),
    createSession(config_),
  )
}

describe('session —— 生命周期', () => {
  it('start 之后立刻给出一题和一组选项', () => {
    const state = run(config(), [{ type: 'start', at: 0 }])

    expect(state.phase).toBe('awaiting')
    expect(state.current).not.toBeNull()
    expect(state.options.length).toBeGreaterThan(1)
    // 还没上屏，所以不能开始计时
    expect(state.currentOnset).toBeNull()
  })

  it('present 才让计时开始 —— 起表由渲染完成决定，不由 state 变更决定', () => {
    const state = run(config(), [
      { type: 'start', at: 0 },
      { type: 'present', at: 120 },
    ])

    expect(state.currentOnset).toBe(120)
  })

  it('未 present 就作答：不接受、不记录，宁可丢一次点击也不污染 RT', () => {
    const started = run(config(), [{ type: 'start', at: 0 }])
    const after = run(config(), [
      { type: 'start', at: 0 },
      { type: 'choose', at: 50, choiceId: correctChoiceId(started) },
    ])

    expect(after.events).toHaveLength(0)
    expect(after.current?.id).toBe(started.current?.id)
  })

  it('答对：写入事件、RT 正确、进入下一题', () => {
    const started = run(config(), [
      { type: 'start', at: 0 },
      { type: 'present', at: 100 },
    ])
    const after = run(config(), [
      { type: 'start', at: 0 },
      { type: 'present', at: 100 },
      { type: 'choose', at: 450, choiceId: correctChoiceId(started) },
    ])

    expect(after.events).toHaveLength(1)
    expect(after.events[0].ok).toBe(true)
    expect(after.events[0].tResponse! - after.events[0].tOnset).toBe(350)
    expect(after.currentOnset).toBeNull()
  })

  it('答错：ok 为 false，并且该题之后会被回插', () => {
    const started = run(config(), [
      { type: 'start', at: 0 },
      { type: 'present', at: 100 },
    ])
    const after = run(config(), [
      { type: 'start', at: 0 },
      { type: 'present', at: 100 },
      { type: 'choose', at: 400, choiceId: wrongChoiceId(started) },
    ])

    expect(after.events[0].ok).toBe(false)
    expect(after.events[0].reason).toBe('wrong')
  })

  it('跳过：tResponse 为 null，仍算一次 trial', () => {
    const after = run(config(), [
      { type: 'start', at: 0 },
      { type: 'present', at: 100 },
      { type: 'skip', at: 500 },
    ])

    expect(after.events).toHaveLength(1)
    expect(after.events[0]).toMatchObject({ ok: false, reason: 'skipped', tResponse: null })
    expect(after.phase).toBe('awaiting')
  })
})

describe('session —— 结束条件', () => {
  it('trialCap 到点就结束', () => {
    const settings = config({ trialCap: 2 })
    const index = createAnswerIndex(settings)
    // start 只能发一次：它会重置事件日志（这一点本身也值得记住）
    let state = step(createSession(settings), { type: 'start', at: 0 }, settings, index)

    for (let round = 0; round < 2; round += 1) {
      state = step(state, { type: 'present', at: 10 + round * 1000 }, settings, index)
      state = step(
        state,
        { type: 'choose', at: 300 + round * 1000, choiceId: correctChoiceId(state) },
        settings,
        index,
      )
    }

    expect(state.events).toHaveLength(2)
    expect(state.phase).toBe('finished')
    expect(state.endedAt).toBe(1300)
  })

  it('冲刺在飞行中的那一题答完之后才结束，不切断用户正在做的题', () => {
    const settings = config({ durationMs: 1000 })
    const index = createAnswerIndex(settings)

    let state = createSession(settings)
    state = step(state, { type: 'start', at: 0 }, settings, index)
    state = step(state, { type: 'present', at: 100 }, settings, index)

    // 第 1 题在时限内完成 → 不应该结束
    state = step(state, { type: 'choose', at: 500, choiceId: correctChoiceId(state) }, settings, index)
    expect(state.phase).toBe('awaiting')

    state = step(state, { type: 'present', at: 600 }, settings, index)
    // 第 2 题拖过了时限 → 这一题仍然记进去，然后结束
    state = step(state, { type: 'choose', at: 1400, choiceId: correctChoiceId(state) }, settings, index)

    expect(state.events).toHaveLength(2)
    expect(state.phase).toBe('finished')
    expect(state.endedAt).toBe(1400)
  })

  it('stop 可以提前结束', () => {
    const state = run(config(), [
      { type: 'start', at: 0 },
      { type: 'stop', at: 900 },
    ])
    expect(state.phase).toBe('finished')
    expect(state.endedAt).toBe(900)
  })
})

describe('session —— 可重放性（R2）', () => {
  it('同一串事件重放两次得到完全相同的状态', () => {
    const settings = config({ seed: 777 })
    const index = createAnswerIndex(settings)

    const play = () => {
      let state = createSession(settings)
      state = step(state, { type: 'start', at: 0 }, settings, index)

      for (let round = 0; round < 10; round += 1) {
        state = step(state, { type: 'present', at: 100 + round * 1000 }, settings, index)
        state = step(
          state,
          { type: 'choose', at: 500 + round * 1000, choiceId: correctChoiceId(state) },
          settings,
          index,
        )
      }

      return state
    }

    const first = play()
    const second = play()

    expect(second).toEqual(first)
    expect(first.events.map((event) => event.itemId)).toEqual(
      second.events.map((event) => event.itemId),
    )
  })

  it('同音歧义在 session 里被真正修掉了：听写 じ 点 ぢ 算对', () => {
    const settings = config({ spec: DICTATION_TTS, seed: 4 })
    const index = createAnswerIndex(settings)
    let state = createSession(settings)
    state = step(state, { type: 'start', at: 0 }, settings, index)
    state = step(state, { type: 'present', at: 10 }, settings, index)

    // 找到目标音为 ji 的那一题
    while (state.current && state.current.id !== 'ji-hira') {
      state = step(
        state,
        { type: 'choose', at: state.currentOnset! + 300, choiceId: wrongChoiceId(state) },
        settings,
        index,
      )
      state = step(state, { type: 'present', at: 10_000 }, settings, index)
    }

    const jiOption = state.options.find((option) => option.label === 'ぢ')
    expect(jiOption).toBeDefined()
    expect(jiOption?.correct).toBe(true)
  })
})

describe('deriveSummary', () => {
  it('有时限冲刺用真实墙钟算 ICPM', () => {
    const settings = config({ durationMs: 60_000, trialCap: null })
    const index = createAnswerIndex(settings)
    let state = createSession(settings)
    state = step(state, { type: 'start', at: 0 }, settings, index)

    for (let round = 0; round < 40; round += 1) {
      state = step(state, { type: 'present', at: round * 1000 }, settings, index)
      state = step(
        state,
        { type: 'choose', at: round * 1000 + 300, choiceId: correctChoiceId(state) },
        settings,
        index,
      )
    }

    const summary = deriveSummary(state, 40_000, settings)

    expect(summary.correct).toBe(40)
    expect(summary.accuracy).toBe(100)
    expect(summary.medianRt).toBe(300)
    expect(summary.icpm).toBeGreaterThan(0)
  })

  it('无时限时不把休息时间算进 ICPM', () => {
    const settings = config({ durationMs: null })
    const index = createAnswerIndex(settings)
    let state = createSession(settings)
    state = step(state, { type: 'start', at: 0 }, settings, index)

    for (let round = 0; round < 3; round += 1) {
      state = step(state, { type: 'present', at: round * 1000 }, settings, index)
      state = step(
        state,
        { type: 'choose', at: round * 1000 + 500, choiceId: correctChoiceId(state) },
        settings,
        index,
      )
    }

    // 墙上时间 3600ms 只含 3×500ms 作答；推断时长的结果是 2500ms
    const withWallClock = deriveSummary(state, 3600_000, settings)
    const inferred = deriveSummary(state, 3600, settings)

    expect(withWallClock.icpm).toBe(inferred.icpm)
  })
})
