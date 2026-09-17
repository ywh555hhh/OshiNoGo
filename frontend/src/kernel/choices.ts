import type { AnswerIndex, PerceptKey } from './grading'
import { normalize } from './grading'
import { shuffle } from './random'
import type { Item } from './types'

/**
 * N 选 1 点按的选项。
 *
 * 这是唯一被允许的作答通道：手指点在已知位置的按钮上，
 * `pointerdown` 延迟只有触摸采样量级（8–30 ms），远比软键盘的字符 commit
 * （IME + 联想 + 纠错，50–150 ms）干净。
 */
export interface Choice {
  id: string
  /** 按钮上显示的内容（识别 drill 显示 romaji，听写 drill 显示假名）。 */
  label: string
  correct: boolean
}

/** 选项集需要的领域知识。DrillSpec 结构上兼容它。 */
export interface ChoiceSource {
  percept: PerceptKey
  labelOf: (item: Item) => string
}

export interface BuildChoiceSetRequest {
  target: Item
  pool: readonly Item[]
  source: ChoiceSource
  /** 预编译的答案索引，用于保证「按钮的对错」与「判分」永不打架。 */
  index: AnswerIndex
  /** 期望的选项总数（含正确项）。实际可能更少。 */
  size: number
  rngState: number
}

export interface ChoiceSet {
  /** 已打乱顺序，可直接渲染。 */
  options: Choice[]
  rngState: number
}

/**
 * 构建选项集。两条不变量（由测试守着）：
 *
 * 1. **同一个标签只出现一次**（按原样比较）——否则用户会看到两个一模一样的按钮。
 * 2. **任何「错」的选项，其标签都不能被 grader 判为正确**；
 *    任何「对」的选项都必须被 grader 判为正确。
 *    这条靠 AnswerIndex 保证，而不是靠调用方自觉。
 *
 * 正确项是**整个感知等价类**：听写 drill 里目标音的 じ 与 ぢ 会同时出现，
 * 点哪个都对——歧义因此变成可选设计，而不是需要文案道歉的 bug。
 */
export function buildChoiceSet(request: BuildChoiceSetRequest): ChoiceSet {
  const { target, pool, source, index, size, rngState } = request
  const targetKey = source.percept(target)
  const accepted = index.get(targetKey) ?? new Set<string>()

  const correctItems: Item[] = []
  const distractorItems: Item[] = []
  const shownLabels = new Set<string>()

  for (const item of pool) {
    if (source.percept(item) !== targetKey) {
      continue
    }

    const label = source.labelOf(item)
    if (shownLabels.has(label)) {
      continue
    }

    shownLabels.add(label)
    correctItems.push(item)
  }

  for (const item of pool) {
    if (source.percept(item) === targetKey) {
      continue
    }

    const label = source.labelOf(item)

    // 不变量 1：字面重复的按钮不允许出现。
    if (shownLabels.has(label)) {
      continue
    }

    // 不变量 2：这个按钮点下去必须真的算错。
    if (accepted.has(normalize(label))) {
      continue
    }

    shownLabels.add(label)
    distractorItems.push(item)
  }

  const wanted = Math.max(correctItems.length, Math.floor(size))
  const shuffled = shuffle(distractorItems, rngState)
  const chosenDistractors = shuffled.items.slice(0, Math.max(0, wanted - correctItems.length))

  const entries: Choice[] = [
    ...correctItems.map((item) => ({
      id: item.id,
      label: source.labelOf(item),
      correct: true,
    })),
    ...chosenDistractors.map((item) => ({
      id: item.id,
      label: source.labelOf(item),
      correct: false,
    })),
  ]

  const ordered = shuffle(entries, shuffled.rngState)

  return { options: ordered.items, rngState: ordered.rngState }
}
