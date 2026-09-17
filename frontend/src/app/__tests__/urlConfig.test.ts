import { describe, expect, it } from 'vitest'

import {
  CHOICE_SIZE_RANGE,
  DEFAULT_DRILL_URL,
  SPRINT_RANGE,
  configKey,
  parseDrillUrl,
  toSearch,
  type DrillUrl,
} from '../urlConfig'

describe('parseDrillUrl', () => {
  it('空查询串给出默认配置', () => {
    expect(parseDrillUrl('')).toEqual(DEFAULT_DRILL_URL)
  })

  it('解析完整配置', () => {
    expect(parseDrillUrl('?set=dakuon,youon&script=both&ch=type&n=6&sprint=30')).toEqual({
      sets: ['dakuon', 'youon'],
      script: 'both',
      channel: 'type',
      choiceSize: 6,
      sprintSeconds: 30,
    })
  })

  it('通道默认为 tap', () => {
    expect(parseDrillUrl('').channel).toBe('tap')
    expect(parseDrillUrl('?ch=banana').channel).toBe('tap')
    expect(parseDrillUrl('?ch=SPEAK').channel).toBe('speak')
  })

  it('三个通道都能解析', () => {
    expect(parseDrillUrl('?ch=tap').channel).toBe('tap')
    expect(parseDrillUrl('?ch=type').channel).toBe('type')
    expect(parseDrillUrl('?ch=speak').channel).toBe('speak')
  })

  it('题库按声明顺序规范化，而不是用户输入的顺序', () => {
    // 这样同一个配置只会产生一个 URL，分享链接才是稳定的
    const a = parseDrillUrl('?set=youon,seion')
    const b = parseDrillUrl('?set=seion,youon')
    expect(a.sets).toEqual(['seion', 'youon'])
    expect(toSearch(a)).toBe(toSearch(b))
  })

  it('去重', () => {
    expect(parseDrillUrl('?set=seion,seion,seion').sets).toEqual(['seion'])
  })

  it('未知题库被丢弃；全未知则回退默认', () => {
    expect(parseDrillUrl('?set=seion,banana').sets).toEqual(['seion'])
    expect(parseDrillUrl('?set=banana').sets).toEqual(DEFAULT_DRILL_URL.sets)
  })

  it('数值越界被夹紧', () => {
    expect(parseDrillUrl(`?n=${CHOICE_SIZE_RANGE.max + 100}`).choiceSize).toBe(
      CHOICE_SIZE_RANGE.max,
    )
    expect(parseDrillUrl('?n=0').choiceSize).toBe(CHOICE_SIZE_RANGE.min)
    expect(parseDrillUrl(`?sprint=${SPRINT_RANGE.max + 1000}`).sprintSeconds).toBe(SPRINT_RANGE.max)
    expect(parseDrillUrl('?sprint=-5').sprintSeconds).toBe(SPRINT_RANGE.min)
  })

  it('小数与非数字一律回退默认', () => {
    expect(parseDrillUrl('?n=4.7').choiceSize).toBe(DEFAULT_DRILL_URL.choiceSize)
    expect(parseDrillUrl('?n=abc').choiceSize).toBe(DEFAULT_DRILL_URL.choiceSize)
    expect(parseDrillUrl('?sprint=').sprintSeconds).toBe(DEFAULT_DRILL_URL.sprintSeconds)
  })

  it('未知参数被忽略', () => {
    expect(parseDrillUrl('?utm_source=wechat&n=3')).toEqual({
      ...DEFAULT_DRILL_URL,
      choiceSize: 3,
    })
  })

  it('坏值不抛异常 —— 被手改坏的分享链接应该还能用', () => {
    expect(() => parseDrillUrl('?set=;;;&script=%&n=%%%')).not.toThrow()
    expect(parseDrillUrl('?script=KATAKANA').script).toBe('katakana')
  })
})

describe('toSearch', () => {
  it('默认配置给出空串（链接尽量短）', () => {
    expect(toSearch(DEFAULT_DRILL_URL)).toBe('')
  })

  it('只输出与默认值不同的项', () => {
    expect(toSearch({ ...DEFAULT_DRILL_URL, choiceSize: 6 })).toBe('?n=6')
    expect(toSearch({ ...DEFAULT_DRILL_URL, sprintSeconds: 0 })).toBe('?sprint=0')
    expect(toSearch({ ...DEFAULT_DRILL_URL, channel: 'type' })).toBe('?ch=type')
  })
})

describe('往返一致性', () => {
  const cases: DrillUrl[] = [
    DEFAULT_DRILL_URL,
    { sets: ['dakuon'], script: 'katakana', channel: 'type', choiceSize: 2, sprintSeconds: 0 },
    {
      sets: ['seion', 'handakuon', 'youon'],
      script: 'both',
      channel: 'speak',
      choiceSize: 8,
      sprintSeconds: 120,
    },
  ]

  it.each(cases)('parse(toSearch(x)) === x', (config) => {
    expect(parseDrillUrl(toSearch(config))).toEqual(config)
  })
})

describe('configKey', () => {
  it('配置不同则 key 不同（Drill 靠它重挂载）', () => {
    const a = configKey(DEFAULT_DRILL_URL)
    const b = configKey({ ...DEFAULT_DRILL_URL, choiceSize: 2 })
    expect(a).not.toBe(b)
  })
})
