import { describe, expect, it } from 'vitest'

import {
  ANTICIPATION_MS,
  IDLE_MS,
  MIN_TRIALS_FOR_TREND,
  celeration,
  coefficientOfVariation,
  mean,
  median,
  stdev,
  summarize,
  toIcpm,
} from '../metrics'
import type { GradeReason, TrialEvent } from '../types'

function trial(
  itemId: string,
  rt: number | null,
  ok: boolean,
  reason: GradeReason = ok ? 'correct' : 'wrong',
): TrialEvent {
  return {
    itemId,
    tOnset: 1000,
    tResponse: rt === null ? null : 1000 + rt,
    response: ok ? 'x' : 'y',
    ok,
    reason,
  }
}

describe('median', () => {
  it('奇数个取中间，偶数个取均值', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBeNull()
  })

  it('不受长尾拖累 —— 这正是不能再用 mean 的原因', () => {
    const withOutlier = [400, 420, 450, 460, 8000]
    expect(median(withOutlier)).toBe(450)
  })

  it('mean 会被一个走神样本拉爆 —— 所以它不再出现在任何指标里', () => {
    const withOutlier = [400, 420, 450, 460, 8000]
    expect(mean(withOutlier)).toBeGreaterThan(median(withOutlier) as number)
    expect(mean(withOutlier)).toBeCloseTo(1946, 0)
    expect(mean([])).toBe(0)
  })
})

describe('coefficientOfVariation —— 区分「变快」与「自动化」', () => {
  const baseline = [1000, 1200, 800, 1000]

  it('speedup：mean 与 sd 成比例下降，CV 不变', () => {
    const speeded = baseline.map((value) => value * 0.7)
    expect(coefficientOfVariation(speeded)).toBeCloseTo(
      coefficientOfVariation(baseline) as number,
      10,
    )
  })

  it('automatization：sd 下降得比 mean 快，CV 下降', () => {
    const automatized = [950, 1000, 1000, 1050]
    expect(median(automatized)).toBe(1000)
    expect(coefficientOfVariation(automatized)).toBeLessThan(
      coefficientOfVariation(baseline) as number,
    )
  })

  it('样本不足时不给结论', () => {
    expect(coefficientOfVariation([500])).toBeNull()
    expect(coefficientOfVariation([])).toBeNull()
  })

  it('stdev 是总体标准差', () => {
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 10)
  })
})

describe('toIcpm', () => {
  it('60 秒内做对 40 个就是 40 个/分', () => {
    expect(toIcpm(40, 60_000)).toBeCloseTo(40, 10)
  })

  it('30 秒内做对 20 个也是 40 个/分', () => {
    expect(toIcpm(20, 30_000)).toBeCloseTo(40, 10)
  })

  it('时长为 0 时不产生 Infinity', () => {
    expect(toIcpm(10, 0)).toBe(0)
  })
})

describe('summarize', () => {
  const events: TrialEvent[] = [
    trial('a', 400, true),
    trial('a', 500, true),
    trial('b', 600, false),
    trial('c', null, false, 'skipped'),
    trial('d', ANTICIPATION_MS - 1, true),
    trial('e', IDLE_MS + 1, true),
  ]

  it('统计量与排除项都是可解释的', () => {
    const metrics = summarize(events, { durationMs: 60_000 })

    expect(metrics.attempts).toBe(6)
    expect(metrics.correct).toBe(4)
    expect(metrics.accuracy).toBeCloseTo((4 / 6) * 100, 10)
    // 只取范围内的正确 trial：400 与 500
    expect(metrics.medianRt).toBe(450)
    expect(metrics.excluded).toEqual({ anticipation: 1, idle: 1, unanswered: 1 })
    expect(metrics.icpm).toBeCloseTo(4, 10)
  })

  it('排除项不静默丢弃 —— 数量必须暴露出来', () => {
    const metrics = summarize(events, { durationMs: 60_000 })
    expect(
      metrics.excluded.anticipation + metrics.excluded.idle + metrics.excluded.unanswered,
    ).toBe(3)
  })

  it('样本不足时明确标记，而不是给出一个貌似可信的数', () => {
    expect(summarize(events).sufficient).toBe(false)
    const many = Array.from({ length: MIN_TRIALS_FOR_TREND }, (_, index) =>
      trial(`i${index}`, 500, true),
    )
    expect(summarize(many, { durationMs: 60_000 }).sufficient).toBe(true)
  })

  it('不传 durationMs 时用首末作答之差推断', () => {
    const metrics = summarize([trial('a', 400, true), trial('b', 600, true)])
    // 首 onset 1000，末 response 1000+600=1600 → 600ms → 2 个/0.01 分
    expect(metrics.icpm).toBeCloseTo(200, 6)
  })

  it('空日志不炸', () => {
    expect(summarize([]).attempts).toBe(0)
    expect(summarize([]).medianRt).toBeNull()
  })
})

describe('celeration', () => {
  it('一周内翻倍 = 2.0', () => {
    expect(celeration(20, 40, 7)).toBeCloseTo(2, 10)
  })

  it('数据不足时返回 null，而不是编一个数', () => {
    expect(celeration(0, 40, 7)).toBeNull()
    expect(celeration(20, 40, 0)).toBeNull()
  })
})
