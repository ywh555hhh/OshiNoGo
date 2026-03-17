import type { KanaItem } from '@/types/training'

export function randomPick<T>(items: T[], exclude?: T | null) {
  if (!items.length) {
    return null
  }

  if (items.length === 1) {
    return items[0]
  }

  let candidate: T
  do {
    candidate = items[Math.floor(Math.random() * items.length)]
  } while (exclude && candidate === exclude)

  return candidate
}

export function buildRecSessionQueue(target: number, pool: KanaItem[]) {
  const totalKana = pool.length
  if (!totalKana) {
    return []
  }

  const normalizedTarget = Number.isFinite(target) && target > 0 ? Math.round(target) : totalKana
  const perKana = Math.floor(normalizedTarget / totalKana)
  const extra = normalizedTarget % totalKana
  const queue: number[] = []

  for (let index = 0; index < totalKana; index += 1) {
    for (let count = 0; count < perKana; count += 1) {
      queue.push(index)
    }
  }

  for (let index = 0; index < extra; index += 1) {
    queue.push(Math.floor(Math.random() * totalKana))
  }

  if (!queue.length) {
    for (let index = 0; index < totalKana; index += 1) {
      queue.push(index)
    }
  }

  for (let index = queue.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]]
  }

  return queue
}
