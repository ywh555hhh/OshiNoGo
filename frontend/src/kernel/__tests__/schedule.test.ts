import { describe, expect, it } from 'vitest'

import { DEFAULT_SCHEDULE, findRequeuable, pickNext, weightFor } from '../schedule'
import type { GradeReason, Item, TrialEvent } from '../types'

const POOL: Item[] = [
  { id: 'A', prompt: 'A' },
  { id: 'B', prompt: 'B' },
  { id: 'C', prompt: 'C' },
  { id: 'D', prompt: 'D' },
]

function trial(itemId: string, ok: boolean, rt = 500, reason?: GradeReason): TrialEvent {
  return {
    itemId,
    tOnset: 0,
    tResponse: rt,
    response: ok ? 'x' : 'y',
    ok,
    reason: reason ?? (ok ? 'correct' : 'wrong'),
    channel: 'tap',
  }
}

describe('findRequeuable —— 组内错误回插', () => {
  it('间隔不够时不回插', () => {
    const events = [trial('A', false), trial('B', true), trial('B', true)]
    expect(findRequeuable(POOL, events, { ...DEFAULT_SCHEDULE, requeueLag: 4 })).toBeNull()
  })

  it('间隔够了就回插那一项', () => {
    const events = [
      trial('A', false),
      trial('B', true),
      trial('B', true),
      trial('B', true),
      trial('B', true),
    ]
    expect(findRequeuable(POOL, events, { ...DEFAULT_SCHEDULE, requeueLag: 4 })?.id).toBe('A')
  })

  it('间隔可以调小 —— 门限是可配置的，不是魔法数', () => {
    const events = [trial('A', false), trial('B', true)]
    expect(findRequeuable(POOL, events, { ...DEFAULT_SCHEDULE, requeueLag: 1 })?.id).toBe('A')
  })

  it('回插次数用尽后不再回插', () => {
    const events = [
      trial('A', false),
      trial('B', true),
      trial('B', true),
      trial('A', false),
      trial('B', true),
      trial('B', true),
    ]
    // A 已出现 2 次，reservices = 1，maxRequeues = 1 时用尽
    expect(findRequeuable(POOL, events, { ...DEFAULT_SCHEDULE, requeueLag: 2, maxRequeues: 1 })).toBeNull()
    expect(findRequeuable(POOL, events, { ...DEFAULT_SCHEDULE, requeueLag: 2, maxRequeues: 2 })?.id).toBe('A')
  })

  it('刚出过的题不回插（否则变成连续重复）', () => {
    const events = [
      trial('B', true),
      trial('B', true),
      trial('B', true),
      trial('B', true),
      trial('A', false),
    ]
    expect(findRequeuable(POOL, events, { ...DEFAULT_SCHEDULE, requeueLag: 1 })).toBeNull()
  })

  it('跳过的题同样会被回插', () => {
    const events = [
      trial('A', false, 0, 'skipped'),
      trial('B', true),
      trial('B', true),
    ]
    expect(findRequeuable(POOL, events, { ...DEFAULT_SCHEDULE, requeueLag: 2 })?.id).toBe('A')
  })

  it('答对的题永远不会被回插', () => {
    const events = [trial('A', true), trial('B', true), trial('B', true)]
    expect(findRequeuable(POOL, events, { ...DEFAULT_SCHEDULE, requeueLag: 1 })).toBeNull()
  })
})

describe('weightFor —— 调度的优先级顺序（不依赖具体调参）', () => {
  const config = DEFAULT_SCHEDULE

  const unseen = weightFor(undefined, config)
  const masteredFast = weightFor({ attempts: 10, correct: 10, rts: [300] }, config)
  const masteredSlow = weightFor({ attempts: 10, correct: 10, rts: [4000] }, config)
  const alwaysWrong = weightFor({ attempts: 10, correct: 0, rts: [] }, config)

  it('没见过的项权重最高（新内容优先）', () => {
    expect(unseen).toBeGreaterThan(alwaysWrong)
  })

  it('全错的项权重高于任何已熟练的项', () => {
    expect(alwaysWrong).toBeGreaterThan(masteredSlow)
  })

  it('又准又慢 比 又准又快 权重高 —— 速度信号必须真正参与调度', () => {
    // 这是原实现会挂掉的一条：准确率 100% 时因子被乘成 0，两者权重完全相同。
    expect(masteredSlow).toBeGreaterThan(masteredFast)
  })

  it('已熟练项权重不为 0（保留抽查，不会彻底消失）', () => {
    expect(masteredFast).toBeGreaterThan(0)
  })

  it('顺序：又快又准 < 又准又慢 < 全错 < 没见过', () => {
    expect(masteredFast).toBeLessThan(masteredSlow)
    expect(masteredSlow).toBeLessThan(alwaysWrong)
    expect(alwaysWrong).toBeLessThan(unseen)
  })
})

describe('pickNext', () => {
  it('池子为空 → null，不崩', () => {
    expect(pickNext({ pool: [], events: [], config: DEFAULT_SCHEDULE, rngState: 1 })).toBeNull()
  })

  it('同样的种子 + 同样的历史 → 同样的下一题（可重放）', () => {
    const request = {
      pool: POOL,
      events: [trial('A', true), trial('B', true)],
      config: DEFAULT_SCHEDULE,
      rngState: 99,
    }
    expect(pickNext(request)?.item.id).toBe(pickNext(request)?.item.id)
  })

  it('不允许连续重复同一题', () => {
    const events = [trial('A', true), trial('B', true), trial('C', true), trial('D', true)]
    for (let seed = 0; seed < 200; seed += 1) {
      const picked = pickNext({ pool: POOL, events, config: DEFAULT_SCHEDULE, rngState: seed })
      expect(picked?.item.id).not.toBe('D')
    }
  })

  it('弱项被抽中的频率高于熟练项，而新项优先级最高', () => {
    // maxRequeues: 0 把回插路径关掉，隔离出纯加权路径
    const config = { ...DEFAULT_SCHEDULE, maxRequeues: 0 }
    const events = [
      trial('A', false),
      trial('A', false),
      trial('D', true, 300),
      trial('D', true, 300),
      trial('D', true, 300),
      trial('B', true, 900), // 最后一项是 B，会被排除在候选外
    ]

    const counts = new Map<string, number>()
    let rngState = 12345

    for (let index = 0; index < 3000; index += 1) {
      const picked = pickNext({ pool: POOL, events, config, rngState })
      if (!picked) {
        throw new Error('pickNext 意外返回 null')
      }
      rngState = picked.rngState
      counts.set(picked.item.id, (counts.get(picked.item.id) ?? 0) + 1)
    }

    const weak = counts.get('A') ?? 0
    const mastered = counts.get('D') ?? 0
    const unseen = counts.get('C') ?? 0

    expect(weak).toBeGreaterThan(mastered * 3)
    expect(unseen).toBeGreaterThan(weak)
    expect(counts.get('B') ?? 0).toBe(0)
  })
})
