import { describe, expect, it } from 'vitest'

import { DEFAULT_SCHEDULE } from '../schedule'
import {
  createAnswerIndex,
  createSession,
  deriveSummary,
  step,
  type SessionConfig,
  type SessionEvent,
  type SessionState,
} from '../session'
import { POOL, SPEAKING, TYPING, itemById } from './fixtures'

function config(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    pool: POOL,
    spec: TYPING,
    schedule: DEFAULT_SCHEDULE,
    durationMs: null,
    trialCap: null,
    seed: 5,
    ...overrides,
  }
}

function run(config_: SessionConfig, events: SessionEvent[]): SessionState {
  const index = createAnswerIndex(config_)
  return events.reduce((state, event) => step(state, event, config_, index), createSession(config_))
}

describe('type 通道', () => {
  it('不构建选项集 —— 于是「点选一个不存在的按钮」这条路径根本不存在', () => {
    const state = run(config(), [{ type: 'start', at: 0 }])
    expect(state.options).toEqual([])
  })

  it('提交文本由 grader 判分，答对记 correct', () => {
    const single = { ...config(), pool: [itemById('ka-hira')] }
    const state = run(single, [
      { type: 'start', at: 0 },
      { type: 'present', at: 10 },
      { type: 'submitText', at: 700, text: 'ka' },
    ])

    expect(state.events).toHaveLength(1)
    expect(state.events[0]).toMatchObject({ ok: true, reason: 'correct', channel: 'type' })
    expect(state.events[0].response).toBe('ka')
  })

  it('别拼法在打字通道同样算对（走的是同一段判分代码）', () => {
    const single = { ...config(), pool: [itemById('shi-hira')] }
    const state = run(single, [
      { type: 'start', at: 0 },
      { type: 'present', at: 10 },
      { type: 'submitText', at: 700, text: 'si' },
    ])

    expect(state.events[0]).toMatchObject({ ok: true, reason: 'equivalent' })
  })

  it('打错就是错', () => {
    const single = { ...config(), pool: [itemById('ka-hira')] }
    const state = run(single, [
      { type: 'start', at: 0 },
      { type: 'present', at: 10 },
      { type: 'submitText', at: 700, text: 'sa' },
    ])

    expect(state.events[0]).toMatchObject({ ok: false, reason: 'wrong' })
  })

  it('空文本不构成一次 trial，也不推进到下一题', () => {
    const settings = config()
    const index = createAnswerIndex(settings)

    // start 只能发一次：它会重置事件日志
    let state = step(createSession(settings), { type: 'start', at: 0 }, settings, index)
    state = step(state, { type: 'present', at: 10 }, settings, index)
    const before = state.current?.id

    for (const blank of ['', '   ', '\t']) {
      state = step(state, { type: 'submitText', at: 700, text: blank }, settings, index)
    }

    expect(state.events).toHaveLength(0)
    expect(state.current?.id).toBe(before)
    expect(state.phase).toBe('awaiting')
  })
})

describe('speak 通道', () => {
  const speakConfig = config({ spec: SPEAKING })

  it('自评通过记 self-pass，且不记录作答文本', () => {
    const state = run(speakConfig, [
      { type: 'start', at: 0 },
      { type: 'present', at: 10 },
      { type: 'selfReport', at: 1500, ok: true },
    ])

    expect(state.events[0]).toMatchObject({
      ok: true,
      reason: 'self-pass',
      response: null,
      channel: 'speak',
    })
  })

  it('自评失败记 self-fail', () => {
    const state = run(speakConfig, [
      { type: 'start', at: 0 },
      { type: 'present', at: 10 },
      { type: 'selfReport', at: 1500, ok: false },
    ])

    expect(state.events[0]).toMatchObject({ ok: false, reason: 'self-fail' })
  })

  it('自评的作答时刻不进 RT 统计（deriveSummary 里 medianRt 为 null）', () => {
    const settings = speakConfig
    const index = createAnswerIndex(settings)

    // start 只能发一次：它会重置事件日志
    let state = step(createSession(settings), { type: 'start', at: 0 }, settings, index)

    for (let round = 0; round < 3; round += 1) {
      state = step(state, { type: 'present', at: round * 1000 }, settings, index)
      state = step(state, { type: 'selfReport', at: round * 1000 + 900, ok: true }, settings, index)
    }

    const summary = deriveSummary(state, 3000, settings)
    expect(summary.attempts).toBe(3)
    expect(summary.medianRt).toBeNull()
    expect(summary.accuracyIsSelfReported).toBe(true)
    expect(summary.excluded.selfReported).toBe(3)
  })
})

describe('通道不匹配的事件一律拒绝', () => {
  it('type drill 收到 choose → 忽略', () => {
    const state = run(config(), [
      { type: 'start', at: 0 },
      { type: 'present', at: 10 },
      { type: 'choose', at: 700, choiceId: 'ka-hira' },
    ])

    expect(state.events).toHaveLength(0)
  })

  it('type drill 收到 selfReport → 忽略', () => {
    const state = run(config(), [
      { type: 'start', at: 0 },
      { type: 'present', at: 10 },
      { type: 'selfReport', at: 700, ok: true },
    ])

    expect(state.events).toHaveLength(0)
  })

  it('speak drill 收到 submitText → 忽略（自评通道不做机器判分）', () => {
    const state = run(config({ spec: SPEAKING }), [
      { type: 'start', at: 0 },
      { type: 'present', at: 10 },
      { type: 'submitText', at: 700, text: 'ka' },
    ])

    expect(state.events).toHaveLength(0)
  })
})

describe('跨通道判分一致性', () => {
  it('点按与打字对同一条输入给出同一结论', () => {
    // 单 item 池：目标确定，且只有一个选项（其标签是标准 romaji）
    const pool = [itemById('shi-hira')]

    const tapConfig = config({ pool, spec: { ...TYPING, channel: 'tap', choiceSize: 4 } })
    const tapIndex = createAnswerIndex(tapConfig)
    const presented = step(
      step(createSession(tapConfig), { type: 'start', at: 0 }, tapConfig, tapIndex),
      { type: 'present', at: 10 },
      tapConfig,
      tapIndex,
    )

    // 选项标签是 romaji 本身（shi），'si' 只是被接受的别名，不是按钮
    const option = presented.options[0]
    expect(option.label).toBe('shi')

    const tapped = step(
      presented,
      { type: 'choose', at: 700, choiceId: option.id },
      tapConfig,
      tapIndex,
    )
    const typed = run(config({ pool }), [
      { type: 'start', at: 0 },
      { type: 'present', at: 10 },
      { type: 'submitText', at: 700, text: 'shi' },
    ])

    // 两条通道走的是同一段判分代码，所以结论不可能分叉
    expect(tapped.events[0].reason).toBe('correct')
    expect(typed.events[0].reason).toBe('correct')
    expect(tapped.events[0].ok).toBe(typed.events[0].ok)
    expect(tapped.events[0].channel).toBe('tap')
    expect(typed.events[0].channel).toBe('type')
  })

  it('打字通道能表达别名，而点按只能表达按钮上的那个标签', () => {
    // 这不是不一致，而是通道本身的表达能力不同：
    // 按钮上只有 'shi'，所以 'si' 这条路只有打字才走得通。
    const pool = [itemById('shi-hira')]
    const typed = run(config({ pool }), [
      { type: 'start', at: 0 },
      { type: 'present', at: 10 },
      { type: 'submitText', at: 700, text: 'si' },
    ])

    expect(typed.events[0]).toMatchObject({ ok: true, reason: 'equivalent' })
  })
})
