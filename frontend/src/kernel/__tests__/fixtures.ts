import type { DrillSpec, Item } from '../index'

/**
 * 测试用的假名数据。
 *
 * 刻意包含三组「真实产品里出过问题的」数据：
 * - あ / ア：mixed 文字下同音但字形不同
 * - じ / ぢ：romaji 完全相同（都是 ji）
 * - し：有 `si` 这个合法别名
 */
export interface KanaItem extends Item {
  kana: string
  romaji: string
  meaning: string
  aliases?: readonly string[]
}

export const POOL: KanaItem[] = [
  { id: 'a-hira', prompt: 'あ', kana: 'あ', romaji: 'a', meaning: '啊' },
  { id: 'a-kata', prompt: 'ア', kana: 'ア', romaji: 'a', meaning: '啊' },
  { id: 'i-hira', prompt: 'い', kana: 'い', romaji: 'i', meaning: '一' },
  { id: 'ka-hira', prompt: 'か', kana: 'か', romaji: 'ka', meaning: '' },
  { id: 'sa-hira', prompt: 'さ', kana: 'さ', romaji: 'sa', meaning: '' },
  {
    id: 'shi-hira',
    prompt: 'し',
    kana: 'し',
    romaji: 'shi',
    meaning: '',
    aliases: ['si'],
  },
  { id: 'ji-hira', prompt: 'じ', kana: 'じ', romaji: 'ji', meaning: '' },
  { id: 'ji-daku', prompt: 'ぢ', kana: 'ぢ', romaji: 'ji', meaning: '' },
  {
    id: 'wo-hira',
    prompt: 'を',
    kana: 'を',
    romaji: 'wo',
    meaning: '',
    aliases: ['o'],
  },
  { id: 'n-hira', prompt: 'ん', kana: 'ん', romaji: 'n', meaning: '', aliases: ['nn'] },
]

const asKana = (item: Item) => item as KanaItem

/** 看字形 → 读 romaji。感知等价类 = 字形，所以每项独立作答。 */
export const RECOGNITION: DrillSpec = {
  id: 'kana-recognition',
  modality: 'visual',
  percept: (item) => asKana(item).kana,
  expectOf: (item) => asKana(item).romaji,
  acceptOf: (item) => asKana(item).aliases ?? [],
  labelOf: (item) => asKana(item).romaji,
  choiceSize: 4,
}

/** 听读音 → 写假名。感知等价类 = 读音，所以 あ/ア、じ/ぢ 互不可区分。 */
export const DICTATION: DrillSpec = {
  id: 'kana-dictation',
  modality: 'audio',
  percept: (item) => asKana(item).romaji,
  expectOf: (item) => asKana(item).kana,
  acceptOf: (item) => asKana(item).aliases ?? [],
  labelOf: (item) => asKana(item).kana,
  choiceSize: 4,
}

export const SPECS: DrillSpec[] = [RECOGNITION, DICTATION]

export function itemById(id: string): KanaItem {
  const found = POOL.find((item) => item.id === id)
  if (!found) {
    throw new Error(`fixture 中不存在 item: ${id}`)
  }
  return found
}
