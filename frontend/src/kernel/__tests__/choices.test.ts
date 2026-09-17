import { describe, expect, it } from 'vitest'

import { buildChoiceSet } from '../choices'
import { buildAnswerIndex, grade } from '../grading'
import { CHOICE_SPECS, DICTATION_TTS, POOL, RECOGNITION, itemById, type KanaItem } from './fixtures'

describe('选项集 —— 不变量', () => {
  it('每一个带选项集的 drill、每一个 item：按钮标记与判分结论必须完全一致', () => {
    for (const spec of CHOICE_SPECS) {
      const index = buildAnswerIndex(POOL, spec)

      for (const target of POOL) {
        const { options } = buildChoiceSet({
          target,
          pool: POOL,
          source: spec,
          index,
          size: spec.choiceSize,
          rngState: 7,
        })

        expect(options.length).toBeGreaterThan(0)

        for (const option of options) {
          const result = grade({ item: target, index, source: spec, response: option.label })

          // 这一条同时保证两件事：
          // - 没有「显示成错、其实判对」的按钮（用户点对了却被告知错）
          // - 没有「显示成对、其实判错」的按钮（用户点错了却被放过）
          expect({
            spec: spec.id,
            target: target.id,
            label: option.label,
            ok: result.ok,
          }).toEqual({
            spec: spec.id,
            target: target.id,
            label: option.label,
            ok: option.correct,
          })
        }
      }
    }
  })

  it('不允许出现两个字面相同的按钮', () => {
    for (const spec of CHOICE_SPECS) {
      const index = buildAnswerIndex(POOL, spec)

      for (const target of POOL) {
        const { options } = buildChoiceSet({
          target,
          pool: POOL,
          source: spec,
          index,
          size: spec.choiceSize,
          rngState: 11,
        })

        const labels = options.map((option) => option.label)
        expect(new Set(labels).size).toBe(labels.length)
      }
    }
  })

  it('识别 drill：じ 的选项里不会混进 ぢ（两者 romaji 都是 ji）', () => {
    const index = buildAnswerIndex(POOL, RECOGNITION)
    const { options } = buildChoiceSet({
      target: itemById('ji-hira'),
      pool: POOL,
      source: RECOGNITION,
      index,
      size: 4,
      rngState: 3,
    })

    expect(options.map((option) => option.label)).not.toContain('ぢ')
    expect(options.filter((option) => option.correct)).toHaveLength(1)
  })

  it('听写 drill：じ 与 ぢ 同时出现，且都标记为正确', () => {
    const index = buildAnswerIndex(POOL, DICTATION_TTS)
    const { options } = buildChoiceSet({
      target: itemById('ji-hira'),
      pool: POOL,
      source: DICTATION_TTS,
      index,
      size: 4,
      rngState: 3,
    })

    const correct = options.filter((option) => option.correct).map((option) => option.label)
    expect(correct.sort()).toEqual(['じ', 'ぢ'])
  })

  it('选项数不超过 choiceSize，且不少于正确项个数', () => {
    const spec = RECOGNITION
    const index = buildAnswerIndex(POOL, spec)

    for (const target of POOL) {
      const { options } = buildChoiceSet({
        target,
        pool: POOL,
        source: spec,
        index,
        size: 4,
        rngState: 5,
      })

      expect(options.length).toBeLessThanOrEqual(4)
      expect(options.filter((option) => option.correct).length).toBeGreaterThan(0)
    }
  })

  it('池子比 choiceSize 小时不会造出重复按钮', () => {
    const tiny: KanaItem[] = [itemById('a-hira'), itemById('a-kata'), itemById('i-hira')]
    const index = buildAnswerIndex(tiny, RECOGNITION)

    const { options } = buildChoiceSet({
      target: tiny[0],
      pool: tiny,
      source: RECOGNITION,
      index,
      size: 6,
      rngState: 1,
    })

    // あ 与 ア 的 romaji 都是 a，所以只应该有 2 个按钮（a / i）
    expect(options.map((option) => option.label).sort()).toEqual(['a', 'i'])
  })

  it('同样的种子给出同样的选项', () => {
    const index = buildAnswerIndex(POOL, RECOGNITION)
    const build = () =>
      buildChoiceSet({
        target: itemById('ka-hira'),
        pool: POOL,
        source: RECOGNITION,
        index,
        size: 4,
        rngState: 42,
      }).options

    expect(build()).toEqual(build())
  })
})
