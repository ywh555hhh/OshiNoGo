import type { GradeReason, Item } from './types'

/** 从 Item 取出「感知等价类」的 key。 */
export type PerceptKey = (item: Item) => string

/**
 * 一个 drill 向判分器提供的全部领域知识。
 *
 * - `percept`：这一项**怎么被感知**。识别 drill 用字形，听写 drill 用读音。
 *   同一个 item 在两种 drill 下可有完全不同的 percept，这就是歧义问题的根治点。
 * - `expectOf`：这一 drill 下该 item 的标准答案。
 * - `acceptOf`：同样算对的其它写法（例：shi ← si / sya）。
 */
export interface AnswerKeySource {
  percept: PerceptKey
  expectOf: (item: Item) => string
  acceptOf?: (item: Item) => readonly string[]
}

/**
 * 答案归一化。
 *
 * - NFKC：全角 → 半角（`ａ` → `a`，`ｼ` → `シ`）
 * - 片假名 → 平假名
 * - 去空白、折叠大小写
 *
 * 长音符 `ー`(U+30FC) 不在折叠区间内，不会被误改。
 * `じ` 与 `ぢ` 是两个不同字符，归一化**不会**把它们合并——
 * 它们的等价关系属于「感知」，只能由 percept 声明，不能靠字符串技巧蒙混。
 */
export function normalize(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '')
    .toLowerCase()
}

/**
 * 预编译的答案索引：percept key → 该等价类下所有可接受的答案。
 *
 * 构建一次，判分时 O(1)。等价类内其它成员的 expect 与 accept 都会被并进来，
 * 因此「听到 ji，答 じ 或 ぢ 都算对」不需要任何特判。
 */
export type AnswerIndex = ReadonlyMap<string, ReadonlySet<string>>

export function buildAnswerIndex(
  pool: readonly Item[],
  source: AnswerKeySource,
): AnswerIndex {
  const index = new Map<string, Set<string>>()

  for (const item of pool) {
    const key = source.percept(item)
    let bucket = index.get(key)
    if (!bucket) {
      bucket = new Set<string>()
      index.set(key, bucket)
    }

    bucket.add(normalize(source.expectOf(item)))
    for (const extra of source.acceptOf?.(item) ?? []) {
      bucket.add(normalize(extra))
    }
  }

  return index
}

export interface GradeResult {
  ok: boolean
  reason: GradeReason
  /** 命中归一化后的哪个字符串；未命中为 null。 */
  matched: string | null
}

const EMPTY_RESULT: GradeResult = { ok: false, reason: 'empty', matched: null }
const WRONG_RESULT: GradeResult = { ok: false, reason: 'wrong', matched: null }

export interface GradeRequest {
  item: Item
  index: AnswerIndex
  source: AnswerKeySource
  response: string
}

/**
 * 判分。唯一判据是「归一化后的输入是否落在该刺激感知等价类的可接受集合里」，
 * 不涉及任何领域知识。
 *
 * 参数用对象而非位置参数：percept key 由这里**自己**从 source 算出来，
 * 调用方无法传进一个与 source 不匹配的 key。这类 bug 靠类型系统直接消掉。
 */
export function grade(request: GradeRequest): GradeResult {
  const { item, index, source, response } = request
  const normalized = normalize(response)
  if (!normalized) {
    return EMPTY_RESULT
  }

  const accepted = index.get(source.percept(item))
  if (!accepted || !accepted.has(normalized)) {
    return WRONG_RESULT
  }

  const canonical = normalize(source.expectOf(item))
  return normalized === canonical
    ? { ok: true, reason: 'correct', matched: canonical }
    : { ok: true, reason: 'equivalent', matched: normalized }
}
