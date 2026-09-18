import { describe, expect, it } from 'vitest'

import {
  buildItemHistory,
  computeLifetime,
  plausibleWallClock,
  rankSlowest,
  rankWeakest,
  type ItemPrior,
} from '../history'
import type { Archive, ArchivedSession } from '../persist'
import type { GradeReason, ResponseChannel, TrialEvent } from '../types'

const DAY = 86_400_000
/** 2026-01-10 12:00 UTC。用正午避开时区边界。 */
const NOW = Date.UTC(2026, 0, 10, 12, 0, 0)

/**
 * 测试夹具的默认 drillId。
 *
 * 让它等于通道名：`session()` 就不必显式传，多数用例可以简写，
 * 而且这正是 v1/v2 档案升级后的实际取值。
 */
const TAP_DRILL = 'tap'

const dayKey = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10)

function event(
  itemId: string,
  rt: number | null,
  ok: boolean,
  channel: ResponseChannel = 'tap',
  reason?: GradeReason,
): TrialEvent {
  return {
    itemId,
    tOnset: 1000,
    tResponse: rt === null ? null : 1000 + rt,
    response: null,
    ok,
    reason: reason ?? (ok ? 'correct' : 'wrong'),
    channel,
  }
}

function session(
  startedAt: number,
  events: TrialEvent[],
  channel: ResponseChannel = 'tap',
  drillId: string = channel,
): ArchivedSession {
  return {
    startedAt,
    endedAt: startedAt + 60_000,
    durationMs: 60_000,
    drillId,
    channel,
    events,
  }
}

function archive(sessions: ArchivedSession[]): Archive {
  return { version: 3, drillId: TAP_DRILL, exportedAt: 0, sessions }
}

describe('buildItemHistory', () => {
  it('逐项累计次数、正确数、准确率与中位反应', () => {
    const history = buildItemHistory(
      archive([
        session(NOW - 2 * DAY, [event('a', 400, true), event('a', 600, false)]),
        session(NOW - DAY, [event('a', 500, true)]),
      ]),
      TAP_DRILL,
    )

    const a = history.byItem.get('a')
    expect(a?.attempts).toBe(3)
    expect(a?.correct).toBe(2)
    expect(a?.accuracy).toBeCloseTo(2 / 3, 10)
    // 只有答对的进速度统计：400 与 500
    expect(a?.medianRt).toBe(450)
    expect(history.sessions).toBe(2)
    expect(history.trials).toBe(3)
  })

  it('lastSeenAt 取 session 的墙钟时间，而不是事件里的 tOnset（那是单调时钟）', () => {
    const history = buildItemHistory(
      archive([session(NOW - DAY, [event('a', 400, true)])]),
      TAP_DRILL,
    )

    expect(history.byItem.get('a')?.lastSeenAt).toBe(NOW - DAY)
  })

  it('连续答对的计数会在答错时归零', () => {
    const history = buildItemHistory(
      archive([
        session(NOW - DAY, [
          event('a', 400, true),
          event('a', 400, true),
          event('a', 400, false),
          event('a', 400, true),
        ]),
      ]),
      TAP_DRILL,
    )

    expect(history.byItem.get('a')?.streak).toBe(1)
  })

  it('准确率与速度都达标才毕业（箱 2）', () => {
    const fast = buildItemHistory(
      archive([session(NOW, Array.from({ length: 10 }, () => event('a', 300, true)))]),
      TAP_DRILL,
    )
    expect(fast.byItem.get('a')?.box).toBe(2)

    const slow = buildItemHistory(
      archive([session(NOW, Array.from({ length: 10 }, () => event('a', 2000, true)))]),
      TAP_DRILL,
    )
    // 全对但很慢 → 不毕业：对一个以速度为目的的 drill，这不算自动化
    expect(slow.byItem.get('a')?.box).toBe(1)
  })

  it('不测速度的 drill（graduateRt: null）只按准确率毕业', () => {
    const history = buildItemHistory(
      archive([session(NOW, Array.from({ length: 10 }, () => event('a', 3000, true)))]),
      TAP_DRILL,
      { graduateRt: null },
    )

    expect(history.byItem.get('a')?.box).toBe(2)
  })

  it('准确率不够就不毕业，哪怕很快', () => {
    const events = Array.from({ length: 10 }, (_, index) => event('a', 300, index < 7))
    const history = buildItemHistory(archive([session(NOW, events)]), TAP_DRILL)

    expect(history.byItem.get('a')?.box).toBe(1)
  })

  it('自评事件不进速度统计（与 metrics 同一口径）', () => {
    const history = buildItemHistory(
      archive([
        session(
          NOW,
          [
            event('a', 900, true, 'speak', 'self-pass'),
            event('a', 900, true, 'speak', 'self-pass'),
          ],
          'speak',
        ),
      ]),
      'speak',
    )

    expect(history.byItem.get('a')?.attempts).toBe(2)
    expect(history.byItem.get('a')?.medianRt).toBeNull()
  })

  it('范围键是 drillId：同一个通道下的不同 drill 不会混在一起', () => {
    // 点选认读与听音选字的作答通道都是 tap，但刺激完全不同、难度也不同。
    // 用通道当范围键会把两者混算 —— 这是这一版修掉的建模错误。
    const shared = archive([
      session(NOW, [event('a', 400, true)], 'tap', 'kana-tap'),
      session(NOW, [event('a', 900, false)], 'tap', 'kana-dictation'),
    ])

    const tapHistory = buildItemHistory(shared, 'kana-tap')
    expect(tapHistory.sessions).toBe(1)
    expect(tapHistory.byItem.get('a')?.attempts).toBe(1)
    expect(tapHistory.byItem.get('a')?.correct).toBe(1)

    const dictationHistory = buildItemHistory(shared, 'kana-dictation')
    expect(dictationHistory.byItem.get('a')?.correct).toBe(0)
  })

  it('空档案不炸', () => {
    const history = buildItemHistory(archive([]), TAP_DRILL)
    expect(history.byItem.size).toBe(0)
    expect(history.sessions).toBe(0)
  })
})

describe('rankWeakest', () => {
  const history = buildItemHistory(
    archive([
      session(NOW, [
        ...Array.from({ length: 5 }, () => event('bad', 400, false)),
        ...Array.from({ length: 5 }, () => event('meh', 400, true)),
        ...Array.from({ length: 5 }, (_, index) => event('meh2', 400, index >= 2)),
        ...Array.from({ length: 5 }, () => event('perfect', 400, true)),
        event('rare', 400, false),
      ]),
    ]),
    TAP_DRILL,
  )

  const pool = ['bad', 'meh', 'meh2', 'perfect', 'rare'].map((id) => ({ id }))

  it('按准确率从低到高，全对的不上榜，样本不足的也不上榜', () => {
    const ranked = rankWeakest(history, pool)

    // bad 全错（5 次）、meh2 错 2/5；perfect 与 meh 全对 → 不上榜；
    // rare 只答了 1 次 → 样本不足，上榜的排名会是噪声。
    expect(ranked.map((prior) => prior.itemId)).toEqual(['bad', 'meh2'])
    expect(ranked.map((prior) => prior.accuracy)).toEqual([0, 0.6])
    expect(ranked.every((prior) => prior.correct < prior.attempts)).toBe(true)
  })

  it('样本太少的项不上榜（默认至少 3 次）', () => {
    const ranked = rankWeakest(history, pool, { minAttempts: 1 })
    expect(ranked.map((prior) => prior.itemId)).toContain('rare')
    // 同为 0 准确率时，作答次数多的排前面（样本更可信）
    expect(ranked[0].itemId).toBe('bad')
  })

  it('池外的项不会出现', () => {
    const ranked = rankWeakest(history, [{ id: 'bad' }])
    expect(ranked.map((prior) => prior.itemId)).toEqual(['bad'])
  })

  it('limit 生效', () => {
    expect(rankWeakest(history, pool, { minAttempts: 1, limit: 1 })).toHaveLength(1)
  })
})

describe('rankSlowest', () => {
  const history = buildItemHistory(
    archive([
      session(NOW, [
        ...Array.from({ length: 5 }, () => event('slow', 1800, true)),
        ...Array.from({ length: 5 }, () => event('fast', 300, true)),
        ...Array.from({ length: 5 }, () => event('nor', 900, false)),
      ]),
    ]),
    TAP_DRILL,
  )

  const pool = ['slow', 'fast', 'nor'].map((id) => ({ id }))

  it('只排有速度数据的项，从慢到快', () => {
    const ranked = rankSlowest(history, pool)

    expect(ranked.map((prior) => prior.itemId)).toEqual(['slow', 'fast'])
    expect(ranked[0].medianRt).toBe(1800)
  })

  it('没有速度数据时返回空，而不是造一个数', () => {
    const blank = buildItemHistory(
      archive([session(NOW, Array.from({ length: 5 }, () => event('a', 400, false)))]),
      TAP_DRILL,
    )
    expect(rankSlowest(blank, [{ id: 'a' }])).toEqual([])
  })
})

describe('computeLifetime', () => {
  const threeDays = archive([
    session(NOW - 2 * DAY, [event('a', 400, true), event('a', 400, false)]),
    session(NOW - DAY, [event('b', 400, true)]),
    session(NOW, [event('c', 400, true)]),
  ])

  it('累计组数、题数、正确率', () => {
    const lifetime = computeLifetime(threeDays, TAP_DRILL, dayKey, NOW)

    expect(lifetime.sessions).toBe(3)
    expect(lifetime.trials).toBe(4)
    expect(lifetime.correct).toBe(3)
    expect(lifetime.accuracy).toBeCloseTo(75, 10)
  })

  it('活跃天数与连续天数', () => {
    const lifetime = computeLifetime(threeDays, TAP_DRILL, dayKey, NOW)

    expect(lifetime.activeDays).toBe(3)
    expect(lifetime.streakDays).toBe(3)
  })

  it('今天还没练但昨天练了，连续天数仍按昨天算', () => {
    const lifetime = computeLifetime(
      archive([session(NOW - DAY, [event('a', 400, true)])]),
      TAP_DRILL,
      dayKey,
      NOW,
    )

    expect(lifetime.streakDays).toBe(1)
  })

  it('断了两天以上，连续天数归零', () => {
    const lifetime = computeLifetime(
      archive([session(NOW - 3 * DAY, [event('a', 400, true)])]),
      TAP_DRILL,
      dayKey,
      NOW,
    )

    expect(lifetime.activeDays).toBe(1)
    expect(lifetime.streakDays).toBe(0)
  })

  it('首次与最近一次时间', () => {
    const lifetime = computeLifetime(threeDays, TAP_DRILL, dayKey, NOW)

    expect(lifetime.firstAt).toBe(NOW - 2 * DAY)
    expect(lifetime.lastAt).toBe(NOW)
  })

  it('只统计当前 drill', () => {
    const mixed = archive([
      session(NOW, [event('a', 400, true)], 'tap', 'kana-tap'),
      session(NOW, [event('a', 400, false)], 'tap', 'kana-dictation'),
    ])

    expect(computeLifetime(mixed, 'kana-tap', dayKey, NOW).trials).toBe(1)
    expect(computeLifetime(mixed, 'kana-tap', dayKey, NOW).correct).toBe(1)
  })

  it('性能时钟造成的时间戳不会被算成「同一天」', () => {
    // 旧档案里 startedAt 存过 performance.now()（页面加载至今的毫秒数）
    const bogus = archive([
      {
        startedAt: 1234,
        endedAt: 5678,
        durationMs: 4444,
        drillId: TAP_DRILL,
        channel: 'tap',
        events: [event('a', 400, true)],
      },
      {
        startedAt: 9999,
        endedAt: 12_000,
        durationMs: 2001,
        drillId: TAP_DRILL,
        channel: 'tap',
        events: [event('b', 400, true)],
      },
    ])

    const lifetime = computeLifetime(bogus, TAP_DRILL, dayKey, NOW)

    // 题数照算，但天数与时间区间不可信 → 一律当未知，不编一个 1970-01-01
    expect(lifetime.trials).toBe(2)
    expect(lifetime.activeDays).toBe(0)
    expect(lifetime.firstAt).toBeNull()
    expect(lifetime.lastAt).toBeNull()
  })

  it('plausibleWallClock 的阈值', () => {
    expect(plausibleWallClock(1234)).toBe(false)
    expect(plausibleWallClock(Date.UTC(2026, 0, 1))).toBe(true)
    expect(plausibleWallClock(Number.NaN)).toBe(false)
  })

  it('空档案给出零值而不是 NaN', () => {
    const lifetime = computeLifetime(archive([]), TAP_DRILL, dayKey, NOW)

    expect(lifetime).toMatchObject({
      sessions: 0,
      trials: 0,
      correct: 0,
      accuracy: 0,
      activeDays: 0,
      streakDays: 0,
      firstAt: null,
      lastAt: null,
    })
  })
})

describe('ItemPrior 作为调度先验的形状', () => {
  it('是一个可序列化进 session config 的普通对象', () => {
    const prior: ItemPrior = {
      itemId: 'a',
      attempts: 3,
      correct: 1,
      accuracy: 1 / 3,
      medianRt: 500,
      lastSeenAt: NOW,
      streak: 0,
      box: 1,
    }

    expect(JSON.parse(JSON.stringify(prior))).toEqual(prior)
  })
})
