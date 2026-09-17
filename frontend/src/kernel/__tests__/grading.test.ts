import { describe, expect, it } from 'vitest'

import { buildAnswerIndex, grade, normalize } from '../grading'
import { DICTATION, POOL, RECOGNITION, itemById } from './fixtures'

describe('normalize', () => {
  it('把全角折成半角', () => {
    expect(normalize('ＳＨＩ')).toBe('shi')
    expect(normalize('ｱ')).toBe(normalize('ア'))
  })

  it('把片假名折成平假名', () => {
    expect(normalize('カ')).toBe('か')
    expect(normalize('キャ')).toBe('きゃ')
  })

  it('保留长音符 ー', () => {
    expect(normalize('コーヒー')).toBe('こーひー')
  })

  it('忽略空白与大小写', () => {
    expect(normalize('  KA  ')).toBe('ka')
  })
})

describe('grade —— 视觉认读', () => {
  const index = buildAnswerIndex(POOL, RECOGNITION)
  const gradeWith = (id: string, response: string) =>
    grade({ item: itemById(id), index, source: RECOGNITION, response })

  it('字形独立作答：じ 答 ji 正确', () => {
    expect(gradeWith('ji-hira', 'ji')).toEqual({
      ok: true,
      reason: 'correct',
      matched: 'ji',
    })
  })

  it('ぢ 也答 ji —— 同为 ji 的两种写法都算对', () => {
    expect(gradeWith('ji-daku', 'ji').ok).toBe(true)
  })

  it('别名 si 算对，但记录为 equivalent', () => {
    expect(gradeWith('shi-hira', 'si')).toEqual({
      ok: true,
      reason: 'equivalent',
      matched: 'si',
    })
    expect(gradeWith('shi-hira', 'shi').reason).toBe('correct')
  })

  it('空输入是 empty，不是 wrong —— 它不构成一次 trial', () => {
    expect(gradeWith('ka-hira', '   ').reason).toBe('empty')
  })

  it('真错的输入是 wrong', () => {
    expect(gradeWith('ka-hira', 'sa').reason).toBe('wrong')
  })

  it('を 的两种常见拼法都算对（wo / o）', () => {
    expect(gradeWith('wo-hira', 'wo').ok).toBe(true)
    expect(gradeWith('wo-hira', 'o').ok).toBe(true)
  })

  it('ん 接受 n 与 nn', () => {
    expect(gradeWith('n-hira', 'n').ok).toBe(true)
    expect(gradeWith('n-hira', 'nn').ok).toBe(true)
  })
})

describe('grade —— 听觉听写（同音歧义）', () => {
  const index = buildAnswerIndex(POOL, DICTATION)
  const gradeWith = (id: string, response: string) =>
    grade({ item: itemById(id), index, source: DICTATION, response })

  it('答案集由感知等价类决定，不是由单个 item 决定', () => {
    // 这是原产品最严重的 bug：目标 じ，用户写 ぢ，被判错。
    expect(gradeWith('ji-hira', 'ぢ').ok).toBe(true)
    expect(gradeWith('ji-hira', 'ぢ').reason).toBe('equivalent')
    expect(gradeWith('ji-daku', 'じ').ok).toBe(true)
  })

  it('あ / ア 互为正确答案（mixed 文字不再是抛硬币）', () => {
    expect(gradeWith('a-hira', 'ア').ok).toBe(true)
    expect(gradeWith('a-kata', 'あ').ok).toBe(true)
  })

  it('听写下答 romaji 是错的 —— 期望答案是假名', () => {
    expect(gradeWith('ji-hira', 'ji').reason).toBe('wrong')
  })

  it('别的音仍然是错的', () => {
    expect(gradeWith('a-hira', 'い').reason).toBe('wrong')
  })
})
