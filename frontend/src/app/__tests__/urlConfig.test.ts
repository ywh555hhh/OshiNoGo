import { describe, expect, it } from 'vitest'

import {
  CHOICE_SIZE_RANGE,
  DEFAULT_DRILL_URL,
  DRILLS,
  SPRINT_RANGE,
  hasChoices,
  parseDrillUrl,
  toSearch,
  type DrillUrl,
} from '../urlConfig'

describe('parseDrillUrl', () => {
  it('空查询串给出默认配置', () => {
    expect(parseDrillUrl('')).toEqual(DEFAULT_DRILL_URL)
  })

  it('解析完整配置', () => {
    expect(parseDrillUrl('?set=dakuon,youon&script=both&drill=type&n=6&sprint=30')).toEqual({
      sets: ['dakuon', 'youon'],
      script: 'both',
      drill: 'type',
      choiceSize: 6,
      sprintSeconds: 30,
    })
  })

  it('四个 drill 都能解析', () => {
    for (const drill of DRILLS) {
      expect(parseDrillUrl(`?drill=${drill}`).drill).toBe(drill)
    }
  })

  it('drill 默认为 tap，未知值回退', () => {
    expect(parseDrillUrl('').drill).toBe('tap')
    expect(parseDrillUrl('?drill=banana').drill).toBe('tap')
    expect(parseDrillUrl('?drill=TYPE').drill).toBe('type')
  })

  it('继续接受历史参数名 ch，避免之前分享出去的链接失效', () => {
    expect(parseDrillUrl('?ch=type').drill).toBe('type')
    expect(parseDrillUrl('?ch=speak').drill).toBe('speak')
    // drill 优先于 ch
    expect(parseDrillUrl('?ch=type&drill=listen').drill).toBe('listen')
  })

  it('题库按声明顺序规范化，而不是用户输入的顺序', () => {
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
    expect(parseDrillUrl(`?sprint=${SPRINT_RANGE.max + 1000}`).sprintSeconds).toBe(
      SPRINT_RANGE.max,
    )
    expect(parseDrillUrl('?sprint=-5').sprintSeconds).toBe(SPRINT_RANGE.min)
  })

  it('小数、空值与非数字一律回退默认', () => {
    expect(parseDrillUrl('?n=4.7').choiceSize).toBe(DEFAULT_DRILL_URL.choiceSize)
    expect(parseDrillUrl('?n=abc').choiceSize).toBe(DEFAULT_DRILL_URL.choiceSize)
    // ?sprint= 的值为空字符串，Number('') === 0 且是整数 —— 不排掉就会被静默变成「不限时」
    expect(parseDrillUrl('?sprint=').sprintSeconds).toBe(DEFAULT_DRILL_URL.sprintSeconds)
    expect(parseDrillUrl('?n=').choiceSize).toBe(DEFAULT_DRILL_URL.choiceSize)
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
    expect(toSearch({ ...DEFAULT_DRILL_URL, drill: 'type' })).toBe('?drill=type')
  })

  it('不带选项集的 drill 不输出 n —— 那个参数对它没有意义', () => {
    const listen = toSearch({ ...DEFAULT_DRILL_URL, drill: 'listen', choiceSize: 6 })
    expect(listen).toBe('?drill=listen&n=6')

    const type = toSearch({ ...DEFAULT_DRILL_URL, drill: 'type', choiceSize: 6 })
    expect(type).toBe('?drill=type')
  })
})

describe('hasChoices', () => {
  it('只有带选项集的 drill 才需要 N', () => {
    expect(hasChoices('tap')).toBe(true)
    expect(hasChoices('listen')).toBe(true)
    expect(hasChoices('type')).toBe(false)
    expect(hasChoices('speak')).toBe(false)
  })
})

describe('往返一致性', () => {
  const cases: DrillUrl[] = [
    DEFAULT_DRILL_URL,
    // 注意：选项数只对带选项集的 drill 有意义，所以非选项类 drill 的
    // choiceSize 不会被写进 URL（也就不会往返）——这里用默认值。
    { sets: ['dakuon'], script: 'katakana', drill: 'type', choiceSize: 4, sprintSeconds: 0 },
    {
      sets: ['seion', 'handakuon', 'youon'],
      script: 'both',
      drill: 'listen',
      choiceSize: 8,
      sprintSeconds: 120,
    },
    { sets: ['seion'], script: 'hiragana', drill: 'speak', choiceSize: 4, sprintSeconds: 60 },
  ]

  it.each(cases)('parse(toSearch(x)) === x', (config) => {
    expect(parseDrillUrl(toSearch(config))).toEqual(config)
  })
})
