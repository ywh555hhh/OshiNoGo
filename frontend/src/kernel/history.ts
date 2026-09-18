import { isSelfReported } from './channels'
import { median } from './metrics'
import type { Archive } from './persist'

export interface ItemHistory {
  byItem: ReadonlyMap<string, ItemPrior>
  /** 参与统计的组数（只计指定 drill）。 */
  sessions: number
  /** 参与统计的 trial 数。 */
  trials: number
}

/**
 * 跨场次的逐项历史。
 *
 * 这是补上一个真实倒退的地方：旧版至少**显示**了「你最弱的假名是哪几个」，
 * 而重构后既没显示、调度器也没用——数据算了却没去处。
 * 这里把它做成一个纯函数产物，于是同一份数据同时供三件事使用：
 *
 * 1. 界面上「易错 / 最慢」榜（用户真正想看的东西）
 * 2. 累计统计（我总共练了多少）
 * 3. **调度器的跨场次先验** —— 让「练」这件事真的发生，而不只是「测」
 *
 * 范围键是 **drillId 而不是 channel**：点选认读与听音选字的作答通道都是 `tap`，
 * 但刺激完全不同，难度也不同。只有同一个 drill 里的历史才是可比的。
 */

/**
 * Leitner 三箱。
 *
 * 不引入 SM-2 那套参数：「扩张间隔 vs 等间隔」的证据本身是冲突的
 * （Kim & Webb 2022 的元分析发现间隔效应稳定，但扩张间隔的优势没能稳定复现），
 * 所以只做等间隔分箱。
 */
export type LeitnerBox = 0 | 1 | 2

export interface ItemPrior {
  itemId: string
  attempts: number
  correct: number
  accuracy: number
  medianRt: number | null
  /** 最后一次出现的墙钟时间；从未见过为 0。 */
  lastSeenAt: number
  /** 从最后一次往前数，连续答对几次。 */
  streak: number
  box: LeitnerBox
}

export interface ItemHistory {
  byItem: ReadonlyMap<string, ItemPrior>
  /** 参与统计的组数（只计指定通道）。 */
  sessions: number
  /** 参与统计的 trial 数。 */
  trials: number
}

export interface HistoryOptions {
  /** 达到这个准确率才有资格毕业。 */
  graduateAccuracy?: number
  /**
   * 毕业所需的速度门槛。
   *
   * 传 `null` 表示这个通道不测速度（例如自评、或 onset 不可知的音频），
   * 此时只看准确率 —— 否则这些通道的项永远无法毕业。
   */
  graduateRt?: number | null
}

const DEFAULT_GRADUATE_ACCURACY = 0.9
const DEFAULT_GRADUATE_RT = 800

interface Accumulator {
  itemId: string
  attempts: number
  correct: number
  rts: number[]
  lastSeenAt: number
  streak: number
}

/**
 * 从档案里汇总逐项历史。
 *
 * 时间顺序即档案顺序：session 按完成顺序追加，session 内事件按作答顺序排列。
 * `lastSeenAt` 取 session 的墙钟开始时间，**不取事件的 tOnset**——
 * tOnset 是 `performance.now()`（单调时钟），每次刷新页面归零，不是墙钟。
 */
export function buildItemHistory(
  archive: Archive,
  drillId: string,
  options: HistoryOptions = {},
): ItemHistory {
  const graduateAccuracy = options.graduateAccuracy ?? DEFAULT_GRADUATE_ACCURACY
  const graduateRt = options.graduateRt === undefined ? DEFAULT_GRADUATE_RT : options.graduateRt

  const accumulators = new Map<string, Accumulator>()
  let sessions = 0
  let trials = 0

  for (const session of archive.sessions) {
    if (session.drillId !== drillId) {
      continue
    }

    sessions += 1
    const sessionAt = plausibleWallClock(session.startedAt) ? session.startedAt : 0

    for (const event of session.events) {
      if (event.reason === 'empty') {
        continue
      }

      trials += 1
      let entry = accumulators.get(event.itemId)
      if (!entry) {
        entry = {
          itemId: event.itemId,
          attempts: 0,
          correct: 0,
          rts: [],
          lastSeenAt: 0,
          streak: 0,
        }
        accumulators.set(event.itemId, entry)
      }

      entry.attempts += 1
      entry.lastSeenAt = Math.max(entry.lastSeenAt, sessionAt)

      if (event.ok) {
        entry.correct += 1
        entry.streak += 1
      } else {
        entry.streak = 0
      }

      // 自评没有机器可信的响应区间，不进速度统计（与 metrics.ts 同一口径）。
      if (event.ok && event.tResponse !== null && !isSelfReported(event.reason)) {
        entry.rts.push(event.tResponse - event.tOnset)
      }
    }
  }

  const byItem = new Map<string, ItemPrior>()

  for (const [itemId, entry] of accumulators) {
    const medianRt = median(entry.rts)
    const accuracy = entry.attempts ? entry.correct / entry.attempts : 0
    const speedOk = graduateRt === null ? true : medianRt !== null && medianRt <= graduateRt

    byItem.set(itemId, {
      itemId,
      attempts: entry.attempts,
      correct: entry.correct,
      accuracy,
      medianRt,
      lastSeenAt: entry.lastSeenAt,
      streak: entry.streak,
      box: accuracy >= graduateAccuracy && speedOk ? 2 : 1,
    })
  }

  return { byItem, sessions, trials }
}

/**
 * `performance.now()` 造出来的时间戳从 0 附近开始（页面加载至今的毫秒数），
 * 而墙钟是 1.7e12 量级。低于这个阈值的一律当作「时间未知」而不是拿去算天数，
 * 否则会把所有历史都算成 1970-01-01 的同一天。
 */
const MIN_PLAUSIBLE_WALL_CLOCK = 1_000_000_000_000

export function plausibleWallClock(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_PLAUSIBLE_WALL_CLOCK
}

export interface LifetimeStats {
  sessions: number
  trials: number
  correct: number
  accuracy: number
  /** 有练习记录的天数。 */
  activeDays: number
  /** 截止 `now`（含）连续练习的天数。 */
  streakDays: number
  firstAt: number | null
  lastAt: number | null
}

/**
 * 累计统计。
 *
 * `dayKey` 由调用方提供，把时区问题留在 app 层：
 * kernel 只负责「怎么算」，不负责「哪一天算今天」。
 */
export function computeLifetime(
  archive: Archive,
  drillId: string,
  dayKey: (timestamp: number) => string,
  now: number,
): LifetimeStats {
  const history = buildItemHistory(archive, drillId)

  let trials = 0
  let correct = 0
  const days = new Set<string>()
  let firstAt: number | null = null
  let lastAt: number | null = null

  for (const session of archive.sessions) {
    if (session.drillId !== drillId) {
      continue
    }

    for (const event of session.events) {
      if (event.reason !== 'empty') {
        trials += 1
        if (event.ok) {
          correct += 1
        }
      }
    }

    if (!plausibleWallClock(session.startedAt)) {
      continue
    }

    days.add(dayKey(session.startedAt))
    firstAt = firstAt === null ? session.startedAt : Math.min(firstAt, session.startedAt)
    lastAt = lastAt === null ? session.startedAt : Math.max(lastAt, session.startedAt)
  }

  return {
    sessions: history.sessions,
    trials,
    correct,
    accuracy: trials ? (correct / trials) * 100 : 0,
    activeDays: days.size,
    streakDays: countStreak(days, dayKey, now),
    firstAt,
    lastAt,
  }
}

/** 从 `now` 那天往前数连续有记录的天数。今天没练但昨天练了，连续天数仍按昨天算。 */
function countStreak(
  days: ReadonlySet<string>,
  dayKey: (timestamp: number) => string,
  now: number,
): number {
  if (!days.size) {
    return 0
  }

  const MS_PER_DAY = 86_400_000
  let streak = 0
  let cursor = now

  // 今天没记录就从昨天起算，避免「今天还没练」直接把连续天数清零
  if (!days.has(dayKey(cursor))) {
    cursor -= MS_PER_DAY
    if (!days.has(dayKey(cursor))) {
      return 0
    }
  }

  while (days.has(dayKey(cursor))) {
    streak += 1
    cursor -= MS_PER_DAY
  }

  return streak
}

export interface RankOptions {
  /** 至少作答几次才有资格上榜。样本太少的排名是噪声。 */
  minAttempts?: number
  limit?: number
}

type PriorWithRt = ItemPrior & { medianRt: number }

function priorsFor(history: ItemHistory, pool: readonly { id: string }[]): ItemPrior[] {
  const result: ItemPrior[] = []

  for (const item of pool) {
    const prior = history.byItem.get(item.id)
    if (prior) {
      result.push(prior)
    }
  }

  return result
}

/** 最容易错的项。全对的不上榜。 */
export function rankWeakest(
  history: ItemHistory,
  pool: readonly { id: string }[],
  options: RankOptions = {},
): ItemPrior[] {
  const minAttempts = options.minAttempts ?? 3
  const limit = options.limit ?? 5

  return priorsFor(history, pool)
    .filter((prior) => prior.attempts >= minAttempts && prior.correct < prior.attempts)
    .sort(
      (left, right) =>
        left.accuracy - right.accuracy ||
        right.attempts - left.attempts ||
        (right.medianRt ?? 0) - (left.medianRt ?? 0),
    )
    .slice(0, limit)
}

/** 反应最慢的项。速度未测的项不上榜。 */
export function rankSlowest(
  history: ItemHistory,
  pool: readonly { id: string }[],
  options: RankOptions = {},
): PriorWithRt[] {
  const minAttempts = options.minAttempts ?? 3
  const limit = options.limit ?? 5

  return priorsFor(history, pool)
    .filter(
      (prior): prior is PriorWithRt => prior.attempts >= minAttempts && prior.medianRt !== null,
    )
    .sort((left, right) => right.medianRt - left.medianRt || left.accuracy - right.accuracy)
    .slice(0, limit)
}
