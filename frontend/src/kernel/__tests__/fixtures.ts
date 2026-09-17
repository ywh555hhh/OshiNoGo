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

/** 三个 drill 共用的答案语义：看字形，答 romaji。 */
const KANA_ANSWER_SOURCE = {
  percept: (item: Item) => asKana(item).kana,
  expectOf: (item: Item) => asKana(item).romaji,
  acceptOf: (item: Item) => asKana(item).aliases ?? [],
  labelOf: (item: Item) => asKana(item).romaji,
}

/** 看字形 → 点选读音。速度指标全部有效。 */
export const RECOGNITION: DrillSpec = {
  id: 'kana-recognition',
  modality: 'visual',
  channel: 'tap',
  choiceSize: 4,
  ...KANA_ANSWER_SOURCE,
}

/** 看字形 → 打出 romaji。产出方向；RT 无效但吞吐有效。 */
export const TYPING: DrillSpec = {
  id: 'kana-typing',
  modality: 'visual',
  channel: 'type',
  choiceSize: 0,
  ...KANA_ANSWER_SOURCE,
}

/** 看字形 → 读出来 → 自评。产出方向；只有自评准确率。 */
export const SPEAKING: DrillSpec = {
  id: 'kana-speaking',
  modality: 'visual',
  channel: 'speak',
  choiceSize: 0,
  ...KANA_ANSWER_SOURCE,
}

/** 听读音 → 写假名。感知等价类 = 读音，所以 あ/ア、じ/ぢ 互不可区分。 */
export const DICTATION: DrillSpec = {
  id: 'kana-dictation',
  modality: 'audio',
  channel: 'tap',
  choiceSize: 4,
  percept: (item) => asKana(item).romaji,
  expectOf: (item) => asKana(item).kana,
  acceptOf: (item) => asKana(item).aliases ?? [],
  labelOf: (item) => asKana(item).kana,
}

/** 选项集相关的不变量只在有选项集的通道上有意义。 */
export const CHOICE_SPECS: DrillSpec[] = [RECOGNITION, DICTATION]
export const ALL_SPECS: DrillSpec[] = [RECOGNITION, TYPING, SPEAKING, DICTATION]

export function itemById(id: string): KanaItem {
  const found = POOL.find((item) => item.id === id)
  if (!found) {
    throw new Error(`fixture 中不存在 item: ${id}`)
  }
  return found
}
