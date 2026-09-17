import type { Item } from '@/kernel'

/**
 * 假名数据包。
 *
 * kernel 不知道「假名」是什么，这个文件才是领域知识的所在。
 * 加一个新的 drill（动词变形 / 数字 / 助词）= 加一个新的数据包，不是加工程。
 */

export type KanaSet = 'seion' | 'dakuon' | 'handakuon' | 'youon'
export type KanaScript = 'hiragana' | 'katakana'

export interface KanaItem extends Item {
  kana: string
  romaji: string
  set: KanaSet
  script: KanaScript
}

export const KANA_SETS: readonly KanaSet[] = ['seion', 'dakuon', 'handakuon', 'youon']

export const KANA_SET_LABELS: Record<KanaSet, string> = {
  seion: '清音',
  dakuon: '浊音',
  handakuon: '半浊音',
  youon: '拗音',
}

type Row = readonly [kana: string, romaji: string]

const SEION: readonly Row[] = [
  ['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o'],
  ['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko'],
  ['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so'],
  ['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to'],
  ['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no'],
  ['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho'],
  ['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo'],
  ['や', 'ya'], ['ゆ', 'yu'], ['よ', 'yo'],
  ['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro'],
  ['わ', 'wa'], ['を', 'wo'], ['ん', 'n'],
]

const DAKUON: readonly Row[] = [
  ['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go'],
  ['ざ', 'za'], ['じ', 'ji'], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo'],
  ['だ', 'da'], ['ぢ', 'ji'], ['づ', 'zu'], ['で', 'de'], ['ど', 'do'],
  ['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo'],
]

const HANDAKUON: readonly Row[] = [
  ['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po'],
]

const YOUON: readonly Row[] = [
  ['きゃ', 'kya'], ['きゅ', 'kyu'], ['きょ', 'kyo'],
  ['ぎゃ', 'gya'], ['ぎゅ', 'gyu'], ['ぎょ', 'gyo'],
  ['しゃ', 'sha'], ['しゅ', 'shu'], ['しょ', 'sho'],
  ['じゃ', 'ja'], ['じゅ', 'ju'], ['じょ', 'jo'],
  ['ちゃ', 'cha'], ['ちゅ', 'chu'], ['ちょ', 'cho'],
  ['にゃ', 'nya'], ['にゅ', 'nyu'], ['にょ', 'nyo'],
  ['ひゃ', 'hya'], ['ひゅ', 'hyu'], ['ひょ', 'hyo'],
  ['びゃ', 'bya'], ['びゅ', 'byu'], ['びょ', 'byo'],
  ['ぴゃ', 'pya'], ['ぴゅ', 'pyu'], ['ぴょ', 'pyo'],
  ['みゃ', 'mya'], ['みゅ', 'myu'], ['みょ', 'myo'],
  ['りゃ', 'rya'], ['りゅ', 'ryu'], ['りょ', 'ryo'],
]

const BY_SET: Record<KanaSet, readonly Row[]> = {
  seion: SEION,
  dakuon: DAKUON,
  handakuon: HANDAKUON,
  youon: YOUON,
}

/**
 * 同一读音的合法别拼。
 *
 * 一个只认单一拼法的「romaji 反射训练器」会把 si / tu / hu 这些完全正当的
 * 输入判成错，从而污染准确率这个核心指标。
 */
const ALIASES: Record<string, readonly string[]> = {
  shi: ['si'],
  chi: ['ti'],
  tsu: ['tu'],
  fu: ['hu'],
  wo: ['o'],
  n: ['nn'],
  ji: ['zi'],
  zu: ['du'],
  sha: ['sya'],
  shu: ['syu'],
  sho: ['syo'],
  ja: ['zya', 'jya'],
  ju: ['zyu', 'jyu'],
  jo: ['zyo', 'jyo'],
  cha: ['tya', 'cya'],
  chu: ['tyu', 'cyu'],
  cho: ['tyo', 'cyo'],
}

export function aliasesFor(romaji: string): readonly string[] {
  return ALIASES[romaji] ?? []
}

function toKatakana(text: string): string {
  return Array.from(text)
    .map((char) => String.fromCharCode(char.charCodeAt(0) + 0x60))
    .join('')
}

function build(rows: readonly Row[], set: KanaSet, script: KanaScript): KanaItem[] {
  return rows.map(([hiragana, romaji]) => {
    const kana = script === 'hiragana' ? hiragana : toKatakana(hiragana)

    return {
      // id 用 kana 本身：208 项里没有重复字形，且稳定（换算法也不会让历史档案失效）
      id: `${script}:${kana}`,
      prompt: kana,
      kana,
      romaji,
      set,
      script,
    }
  })
}

/** 全部 208 项（104 个假名 × 平/片假名）。 */
export const KANA_POOL: readonly KanaItem[] = KANA_SETS.flatMap((set) => [
  ...build(BY_SET[set], set, 'hiragana'),
  ...build(BY_SET[set], set, 'katakana'),
])
