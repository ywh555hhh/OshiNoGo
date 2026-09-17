import type { ItemPrior } from './history'
import { median } from './metrics'
import { pickWeighted } from './random'
import type { Item, TrialEvent } from './types'

export interface ScheduleConfig {
  /** 错题至少间隔多少 trial 才允许回插。 */
  requeueLag: number
  /** 同一项最多回插几次。 */
  maxRequeues: number
  /** 完全没见过的项的基础权重。 */
  unseenWeight: number
  /** 准确率项指数：weight 含 (1 - accuracy)^accExp。 */
  accExp: number
  /** 速度项指数：weight 含 (rt / targetRt)^speedExp。 */
  speedExp: number
  /** 目标反应时间（ms），作为速度权重的基准。 */
  targetRt: number
}

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  requeueLag: 4,
  maxRequeues: 2,
  unseenWeight: 3,
  accExp: 2,
  speedExp: 1,
  targetRt: 800,
}

export interface PickRequest {
  pool: readonly Item[]
  events: readonly TrialEvent[]
  config: ScheduleConfig
  rngState: number
  /**
   * 跨场次逐项历史。
   *
   * 有它，调度器才会真的「学习」；没有它，每一组都是孤立的一次测量。
   * 这是把产品从「测」变成「练」的关键输入。
   */
  prior?: ReadonlyMap<string, ItemPrior>
}

export interface PickResult {
  item: Item
  rngState: number
}

interface ItemStats {
  attempts: number
  correct: number
  rts: number[]
}

function collectStats(events: readonly TrialEvent[]): Map<string, ItemStats> {
  const stats = new Map<string, ItemStats>()

  for (const event of events) {
    let entry = stats.get(event.itemId)
    if (!entry) {
      entry = { attempts: 0, correct: 0, rts: [] }
      stats.set(event.itemId, entry)
    }

    entry.attempts += 1
    if (event.ok) {
      entry.correct += 1
      if (event.tResponse !== null) {
        entry.rts.push(event.tResponse - event.tOnset)
      }
    }
  }

  return stats
}

/**
 * 已熟练项的下限权重。不为 0，保证「保持」抽查会偶尔出现。
 */
const ACCURACY_FLOOR = 0.15

/**
 * 速度项下限。
 *
 * 没有这个下限的话，会写成一个外层 `max(0.05, (1-acc)^2 · …)`：
 * 准确率 100% 时前面的因子恒为 0，于是「又准又慢」和「又准又快」
 * 拿到**完全相同**的权重——对一个以速度为目的的 drill，这等于把速度信号抹掉。
 * 两个因子各自带下限再相乘，速度才真正参与调度。
 */
const SPEED_FLOOR = 0.25

/** 毕业箱：准确率与速度都达标。 */
const GRADUATED_BOX = 2

/** 已毕业项的降权系数。不清零，保留「保持」抽查。 */
const GRADUATED_DISCOUNT = 0.3

export function weightFor(
  stats: ItemStats | undefined,
  config: ScheduleConfig,
  prior?: ItemPrior,
): number {
  // 本组计数与跨场次先验合并（把计数相加，而不是对两个比率加权平均）——
  // 这样样本多的那一侧自然更重，不需要另选权重参数。
  const attempts = (stats?.attempts ?? 0) + (prior?.attempts ?? 0)
  if (attempts === 0) {
    return config.unseenWeight
  }

  const correct = (stats?.correct ?? 0) + (prior?.correct ?? 0)
  const accuracy = correct / attempts
  const rt = median(stats?.rts ?? []) ?? prior?.medianRt ?? config.targetRt

  const accuracyFactor = Math.max(ACCURACY_FLOOR, (1 - accuracy) ** config.accExp)
  const speedFactor = Math.max(SPEED_FLOOR, rt / config.targetRt) ** config.speedExp
  const graduation = prior?.box === GRADUATED_BOX ? GRADUATED_DISCOUNT : 1

  return accuracyFactor * speedFactor * graduation
}

/**
 * 找出应该立刻回插的错题。
 *
 * 抽出来单独导出是为了**可确定性测试**——如果只能通过 pickNext 观察，
 * 回插路径和加权路径会混在一起，测试就只能写成统计断言，无法证明逻辑。
 */
export function findRequeuable(
  pool: readonly Item[],
  events: readonly TrialEvent[],
  config: ScheduleConfig,
): Item | null {
  const byId = new Map(pool.map((item) => [item.id, item]))
  const stats = collectStats(events)
  const lastItemId = events.length ? events[events.length - 1].itemId : null

  // 取「最老的、已经满足间隔的」错题，让间隔尽量长。
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    if (event.ok || event.reason === 'empty') {
      continue
    }

    const item = byId.get(event.itemId)
    if (!item || item.id === lastItemId) {
      continue
    }

    const trialsSince = events.length - 1 - index
    if (trialsSince < config.requeueLag) {
      continue
    }

    const entry = stats.get(event.itemId)
    const reservices = (entry?.attempts ?? 1) - 1
    if (reservices >= config.maxRequeues) {
      continue
    }

    return item
  }

  return null
}

/**
 * 挑下一题。三层调度里目前实现了前两层：
 *
 * 1. **组内错误回插** —— 答错的项在间隔 `requeueLag` 题后重新出现。
 *    现有产品完全没有这个机制，这是「测」和「练」的分水岭。
 * 2. **熟练度加权** —— `(1-acc)^accExp · max(0.25, rt/targetRt)^speedExp`，
 *    把已经算出来的 weakest / slowest 真正接回抽题。
 *
 * 第 3 层（跨场次 Leitner）在 P4。
 */
export function pickNext(request: PickRequest): PickResult | null {
  const { pool, events, config, rngState, prior } = request

  if (!pool.length) {
    return null
  }

  const requeue = findRequeuable(pool, events, config)
  if (requeue) {
    return { item: requeue, rngState }
  }

  const stats = collectStats(events)
  const lastItemId = events.length ? events[events.length - 1].itemId : null

  // 排除刚出过的题，避免连续重复。
  const candidates: Item[] = []
  const weights: number[] = []

  for (const item of pool) {
    if (item.id === lastItemId && pool.length > 1) {
      continue
    }

    candidates.push(item)
    weights.push(weightFor(stats.get(item.id), config, prior?.get(item.id)))
  }

  const picked = pickWeighted(candidates, weights, rngState)
  if (!picked) {
    return { item: pool[0], rngState }
  }

  return { item: picked.item, rngState: picked.rngState }
}
