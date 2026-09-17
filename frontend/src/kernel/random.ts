/**
 * 带种子的伪随机数发生器（mulberry32）。
 *
 * 为什么不用 Math.random：调度器必须是**可重放的纯函数**，
 * 否则「同一串作答为什么给出不同的下一题」无法测试、无法复现。
 * 这里把状态显式地作为一个 number 传来传去，因此它可以直接序列化进 session state。
 */

export interface RngStep {
  value: number
  state: number
}

export function nextRandom(state: number): RngStep {
  const t = (state + 0x6d2b79f5) | 0
  let x = t
  x = Math.imul(x ^ (x >>> 15), x | 1)
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296

  return { value, state: t }
}

export interface ShuffleResult<T> {
  items: T[]
  rngState: number
}

/** Fisher-Yates，状态线程化，纯函数。 */
export function shuffle<T>(items: readonly T[], rngState: number): ShuffleResult<T> {
  const output = [...items]
  let state = rngState

  for (let index = output.length - 1; index > 0; index -= 1) {
    const draw = nextRandom(state)
    state = draw.state
    const swapIndex = Math.floor(draw.value * (index + 1))
    const carried = output[index]
    output[index] = output[swapIndex]
    output[swapIndex] = carried
  }

  return { items: output, rngState: state }
}

export interface WeightedPick<T> {
  item: T
  rngState: number
}

/** 按权重抽取一个元素。权重非正时退化为均匀抽取。 */
export function pickWeighted<T>(
  items: readonly T[],
  weights: readonly number[],
  rngState: number,
): WeightedPick<T> | null {
  if (!items.length) {
    return null
  }

  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0)

  if (total <= 0) {
    const draw = nextRandom(rngState)
    return {
      item: items[Math.floor(draw.value * items.length)],
      rngState: draw.state,
    }
  }

  const draw = nextRandom(rngState)
  let threshold = draw.value * total

  for (let index = 0; index < items.length; index += 1) {
    threshold -= Math.max(0, weights[index])
    if (threshold <= 0) {
      return { item: items[index], rngState: draw.state }
    }
  }

  return { item: items[items.length - 1], rngState: draw.state }
}
