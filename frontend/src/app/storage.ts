import { ARCHIVE_VERSION, summarize, type Archive, type ArchivedSession, type ResponseChannel } from '@/kernel'
import { deserializeArchive, serializeArchive } from '@/kernel'

export type ThemePreference = 'light' | 'dark' | 'system'

export interface StoredState {
  theme: ThemePreference
  archive: Archive
}

const STORAGE_KEY = 'oshinogo.v1'

/**
 * 保留多少组历史。
 *
 * 事件日志是唯一真相（R2），所以上限必须显式存在，否则 localStorage
 * 会被无界日志撑爆。30 组 × 约 40 题 ≈ 150 KB，足够画趋势，也留足配额。
 */
export const MAX_ARCHIVED_SESSIONS = 30

const THEMES: readonly ThemePreference[] = ['light', 'dark', 'system']

function emptyArchive(drillId: string): Archive {
  return { version: ARCHIVE_VERSION, drillId, exportedAt: 0, sessions: [] }
}

export function defaultState(drillId: string): StoredState {
  return { theme: 'system', archive: emptyArchive(drillId) }
}

function parseTheme(value: unknown): ThemePreference {
  return THEMES.find((theme) => theme === value) ?? 'system'
}

export interface LoadResult {
  state: StoredState
  /** 读失败（无痕模式 / 配额 / 数据损坏）时为 true，UI 应给出提示而不是假装正常。 */
  degraded: boolean
}

/**
 * 读档案。任何异常都回退到默认值并标记 degraded ——
 * 存不了就明说，不静默假装已保存。
 */
export function loadState(drillId: string): LoadResult {
  const fallback = defaultState(drillId)

  if (typeof window === 'undefined') {
    return { state: fallback, degraded: false }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { state: fallback, degraded: false }
    }

    const outer: unknown = JSON.parse(raw)
    if (!outer || typeof outer !== 'object') {
      return { state: fallback, degraded: true }
    }

    const candidate = outer as Partial<StoredState>
    const archive =
      typeof candidate.archive === 'string'
        ? deserializeArchive(candidate.archive)
        : deserializeArchive(JSON.stringify(candidate.archive))

    return {
      state: {
        theme: parseTheme(candidate.theme),
        archive: archive ?? emptyArchive(drillId),
      },
      degraded: archive === null,
    }
  } catch {
    return { state: fallback, degraded: true }
  }
}

/** @returns 是否真的写进去了。false = 页面本次可用但刷新即丢。 */
export function saveState(state: StoredState): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

/** 导出的文件就是事件日志本身，不需要第二套格式。 */
export function exportArchiveFile(archive: Archive): string {
  return serializeArchive({ ...archive, exportedAt: Date.now() })
}

export function importArchiveFile(raw: string): Archive | null {
  return deserializeArchive(raw)
}

export function appendSession(archive: Archive, session: ArchivedSession): Archive {
  return {
    ...archive,
    sessions: [...archive.sessions, session].slice(-MAX_ARCHIVED_SESSIONS),
  }
}

export interface TrendPoint {
  icpm: number
  accuracy: number
  at: number
  /** 这一组的准确率是不是自评来的。 */
  selfReported: boolean
}

/**
 * 趋势。
 *
 * **必须按通道过滤**：不同通道的 ICPM 不可比（打字的每试次恒定开销
 * 与点按不是一个量级）。把 tap 和 type 的点画在同一条柱状图上，
 * 看着像「变慢了」，其实只是换了通道。
 */
export function buildTrend(
  archive: Archive,
  channel: ResponseChannel,
  limit = 12,
): TrendPoint[] {
  return archive.sessions
    .filter((session) => session.channel === channel)
    .flatMap((session) => {
      const metrics = summarize(session.events, {
        durationMs: session.durationMs,
        channel,
      })

      if (!metrics.sufficient) {
        return []
      }

      return [
        {
          icpm: metrics.icpm,
          accuracy: metrics.accuracy,
          at: session.startedAt,
          selfReported: metrics.accuracyIsSelfReported,
        },
      ]
    })
    .slice(-limit)
}
