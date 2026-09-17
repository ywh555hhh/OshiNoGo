import type { DrillSpec, Item } from '@/kernel'

import { KANA_POOL, aliasesFor, type KanaItem, type KanaSet, type KanaScript } from './kana'

export const RECOGNITION_SPEC_ID = 'kana-recognition'

export type ScriptMode = KanaScript | 'both'

const asKana = (item: Item) => item as KanaItem

/**
 * 形 → 音。
 *
 * `percept` 用**字形**：屏幕上的 じ 与 ぢ 是两张不同的图，所以它们是两道独立的题；
 * 但两者的 romaji 都是 ji，靠 `aliasesFor` + 答案索引让两个都判对。
 *
 * 这是与听写 drill 的关键区别——听写用读音当 percept，于是 じ/ぢ 变成同组、
 * 「答哪个都对」。歧义在哪里出现、以什么形式出现，完全由这个函数决定。
 */
export function recognitionSpec(choiceSize: number): DrillSpec {
  return {
    id: RECOGNITION_SPEC_ID,
    modality: 'visual',
    percept: (item) => asKana(item).kana,
    expectOf: (item) => asKana(item).romaji,
    acceptOf: (item) => aliasesFor(asKana(item).romaji),
    labelOf: (item) => asKana(item).romaji,
    choiceSize,
  }
}

export function selectPool(sets: readonly KanaSet[], script: ScriptMode): KanaItem[] {
  const wanted = new Set(sets)

  return KANA_POOL.filter((item) => {
    if (!wanted.has(item.set)) {
      return false
    }

    return script === 'both' ? true : item.script === script
  })
}
