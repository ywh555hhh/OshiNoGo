import type { DrillSpec, Item } from '@/kernel'

import { KANA_POOL, aliasesFor, type KanaItem, type KanaSet, type KanaScript } from './kana'

export type ScriptMode = KanaScript | 'both'

const asKana = (item: Item) => item as KanaItem

/**
 * 三个视觉 drill 共用同一套答案语义：看字形，答 romaji。
 *
 * `percept` 用**字形**：屏幕上的 じ 与 ぢ 是两张不同的图，所以它们是两道独立的题；
 * 但两者的 romaji 都是 ji，靠 aliases + 答案索引让两个都判对。
 *
 * 与听写 drill 的关键区别：听写用读音当 percept，于是 じ/ぢ 变成同组「答哪个都对」。
 * 歧义在哪里出现、以什么形式出现，完全由这个函数决定。
 */
const KANA_ANSWER_SOURCE = {
  percept: (item: Item) => asKana(item).kana,
  expectOf: (item: Item) => asKana(item).romaji,
  acceptOf: (item: Item) => aliasesFor(asKana(item).romaji),
  labelOf: (item: Item) => asKana(item).romaji,
}

/**
 * 形 → 选音。
 *
 * 接受性方向。延迟只有触摸采样量级，画面起表，所以三个指标全部有效。
 */
export function tapSpec(choiceSize: number): DrillSpec {
  return {
    id: 'kana-tap',
    modality: 'visual',
    onset: 'paint',
    channel: 'tap',
    choiceSize,
    ...KANA_ANSWER_SOURCE,
  }
}

/**
 * 形 → 打 romaji。
 *
 * 产出方向。这是接受性练习**不能替代**的部分：能认出 じ 不等于能写出 ji。
 *
 * 单题 RT 无效（测的是输入法而不是假名），但吞吐仍然有效——
 * ICPM 对「每题恒定延迟」只乘一个恒定系数，所以通道内的趋势依然成立。
 */
export function typeSpec(): DrillSpec {
  return {
    id: 'kana-type',
    modality: 'visual',
    onset: 'paint',
    channel: 'type',
    // 不使用选项集
    choiceSize: 0,
    ...KANA_ANSWER_SOURCE,
  }
}

/**
 * 形 → 读出来 → 自评。
 *
 * 产出方向的口头版本。产出效应（MacLeod et al. 2010）表明出声读比默读
 * 有额外的记忆增益，所以这个通道不只是练口部动作。
 *
 * 没有可靠的自动判分手段（SpeechRecognition 不是 Baseline、Android WebView
 * 支持不完整、Chrome 实现是服务端识别要联网上传音频），所以准确率是自评的。
 */
export function speakSpec(): DrillSpec {
  return {
    id: 'kana-speak',
    modality: 'visual',
    onset: 'paint',
    channel: 'speak',
    choiceSize: 0,
    ...KANA_ANSWER_SOURCE,
  }
}

/**
 * 音 → 选形（听写）。
 *
 * 两点与前三个 drill 本质不同：
 *
 * 1. **percept 用读音。** 所以 じ/ぢ 与 あ/ア 是同一组「答哪个都对」——
 *    歧义在这里变成设计，而不是需要文案道歉的 bug。
 * 2. **onset 不可知**（speechSynthesis 没有可靠的播放起点事件）。
 *    于是这个 drill 只能是**不计时的练习**：没有 RT，也没有可比的吞吐，
 *    因为每条的 TTS 启动与音节时长都不一样，「个/分」会被音频长度污染。
 *
 * 等预渲染音频管线到位，把 `onset` 改成 `'audio-scheduled'` 就能拿回速度指标，
 * 其余代码一行都不用动。
 */
export function dictationSpec(choiceSize: number): DrillSpec {
  return {
    id: 'kana-dictation',
    modality: 'audio',
    onset: 'audio-unknown',
    channel: 'tap',
    choiceSize,
    percept: (item: Item) => asKana(item).romaji,
    expectOf: (item: Item) => asKana(item).kana,
    acceptOf: (item: Item) => aliasesFor(asKana(item).romaji),
    labelOf: (item: Item) => asKana(item).kana,
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
