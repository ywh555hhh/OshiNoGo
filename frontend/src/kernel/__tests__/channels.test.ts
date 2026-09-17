import { describe, expect, it } from 'vitest'

import { METRIC_SUPPORT, RESPONSE_CHANNELS, channelsPresent, isSelfReported } from '../channels'
import { summarize } from '../metrics'
import type { ResponseChannel, TrialEvent } from '../types'

function trial(
  channel: ResponseChannel,
  rt: number | null,
  ok: boolean,
  reason: TrialEvent['reason'],
  itemId = 'x',
): TrialEvent {
  return {
    itemId,
    tOnset: 1000,
    tResponse: rt === null ? null : 1000 + rt,
    response: null,
    ok,
    reason,
    channel,
  }
}

describe('METRIC_SUPPORT —— R1 的可执行形式', () => {
  it('每个通道都有声明，没有遗漏', () => {
    for (const channel of RESPONSE_CHANNELS) {
      expect(METRIC_SUPPORT[channel]).toBeDefined()
    }
    expect(Object.keys(METRIC_SUPPORT)).toHaveLength(RESPONSE_CHANNELS.length)
  })

  it('只有 tap 的逐题 RT 有效 —— 其它通道的 ms 测的不是假名', () => {
    expect(METRIC_SUPPORT.tap.reactionTime).toBe(true)
    expect(METRIC_SUPPORT.type.reactionTime).toBe(false)
    expect(METRIC_SUPPORT.speak.reactionTime).toBe(false)
  })

  it('吞吐（个/分）对三个通道都有效 —— 恒定延迟只乘一个恒定系数', () => {
    for (const channel of RESPONSE_CHANNELS) {
      expect(METRIC_SUPPORT[channel].throughput).toBe(true)
    }
  })

  it('只有 speak 是自评的', () => {
    expect(METRIC_SUPPORT.tap.machineGraded).toBe(true)
    expect(METRIC_SUPPORT.type.machineGraded).toBe(true)
    expect(METRIC_SUPPORT.speak.machineGraded).toBe(false)
  })
})

describe('isSelfReported', () => {
  it('只认自评的两个 reason', () => {
    expect(isSelfReported('self-pass')).toBe(true)
    expect(isSelfReported('self-fail')).toBe(true)
    expect(isSelfReported('correct')).toBe(false)
    expect(isSelfReported('wrong')).toBe(false)
  })
})

describe('channelsPresent', () => {
  it('按声明顺序返回，去重', () => {
    const events = [
      trial('speak', null, true, 'self-pass'),
      trial('tap', 400, true, 'correct'),
      trial('tap', 500, true, 'correct'),
    ]
    expect(channelsPresent(events)).toEqual(['tap', 'speak'])
  })
})

describe('summarize —— 自评不进速度统计', () => {
  const events = [
    trial('tap', 400, true, 'correct'),
    trial('tap', 500, true, 'correct'),
    trial('tap', 600, false, 'wrong'),
  ]

  it('机器判分通道：三个指标都出得来', () => {
    const metrics = summarize(events, { durationMs: 60_000 })

    expect(metrics.attempts).toBe(3)
    expect(metrics.medianRt).toBe(450)
    expect(metrics.accuracyIsSelfReported).toBe(false)
    expect(metrics.mixedChannels).toBe(false)
  })

  it('自评通道：准确率有，RT 没有', () => {
    const spoke = [trial('speak', 1200, true, 'self-pass'), trial('speak', 900, false, 'self-fail')]
    const metrics = summarize(spoke, { durationMs: 60_000 })

    expect(metrics.attempts).toBe(2)
    expect(metrics.accuracy).toBe(50)
    // 自评也照实标出来，不许伪装成机器判分
    expect(metrics.accuracyIsSelfReported).toBe(true)
    // 自评没有机器可信的响应区间
    expect(metrics.medianRt).toBeNull()
    expect(metrics.cv).toBeNull()
    expect(metrics.excluded.selfReported).toBe(2)
  })

  it('自评不影响吞吐：它仍然是「这段时间里做对多少」', () => {
    const spoke = [trial('speak', null, true, 'self-pass'), trial('speak', null, true, 'self-pass')]
    expect(summarize(spoke, { durationMs: 60_000 }).icpm).toBeCloseTo(2, 10)
  })
})

describe('summarize —— 混通道必须可检测', () => {
  it('混了通道就置 mixedChannels，因为这些数不可跨通道比较', () => {
    const events = [trial('tap', 400, true, 'correct'), trial('speak', null, true, 'self-pass')]
    const metrics = summarize(events, { durationMs: 60_000 })

    expect(metrics.mixedChannels).toBe(true)
    expect(metrics.channels).toHaveLength(2)
    const byChannel = new Map(metrics.channels.map((tally) => [tally.channel, tally]))
    expect(byChannel.get('tap')?.attempts).toBe(1)
    expect(byChannel.get('speak')?.selfReported).toBe(true)
  })

  it('给了 channel 过滤就没有混通道的风险', () => {
    const events = [trial('tap', 400, true, 'correct'), trial('speak', null, true, 'self-pass')]

    const tapOnly = summarize(events, { durationMs: 60_000, channel: 'tap' })
    expect(tapOnly.mixedChannels).toBe(false)
    expect(tapOnly.attempts).toBe(1)
    expect(tapOnly.medianRt).toBe(400)

    const speakOnly = summarize(events, { durationMs: 60_000, channel: 'speak' })
    expect(speakOnly.attempts).toBe(1)
    expect(speakOnly.medianRt).toBeNull()
  })

  it('单通道本身不算混', () => {
    const metrics = summarize([trial('type', 900, true, 'correct')], { durationMs: 60_000 })
    expect(metrics.mixedChannels).toBe(false)
    expect(metrics.channels).toEqual([
      { channel: 'type', attempts: 1, correct: 1, selfReported: false },
    ])
  })
})
