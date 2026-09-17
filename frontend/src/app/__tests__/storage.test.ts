import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Archive, ArchivedSession, ResponseChannel, TrialEvent } from '@/kernel'
import { ARCHIVE_VERSION } from '@/kernel'

import {
  MAX_ARCHIVED_SESSIONS,
  appendSession,
  buildTrend,
  defaultState,
  exportArchiveFile,
  importArchiveFile,
  loadState,
  saveState,
} from '../storage'

function events(count: number, rt = 400, channel: ResponseChannel = 'tap'): TrialEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    itemId: `item-${index}`,
    tOnset: index * 1000,
    tResponse: index * 1000 + rt,
    response: channel === 'speak' ? null : 'a',
    ok: true,
    reason: channel === 'speak' ? ('self-pass' as const) : ('correct' as const),
    channel,
  }))
}

function session(
  count = 30,
  durationMs: number | null = 60_000,
  channel: ResponseChannel = 'tap',
): ArchivedSession {
  return {
    startedAt: 0,
    endedAt: durationMs,
    durationMs,
    channel,
    events: events(count, 400, channel),
  }
}

function emptyArchive(): Archive {
  return { version: ARCHIVE_VERSION, drillId: 'kana-recognition', exportedAt: 0, sessions: [] }
}

function installStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  const localStorage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
  vi.stubGlobal('window', { localStorage })
  return map
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('appendSession', () => {
  it('追加在末尾', () => {
    const archive = appendSession(emptyArchive(), session())
    expect(archive.sessions).toHaveLength(1)
  })

  it('超过上限时丢掉最老的 —— 事件日志不能无界增长', () => {
    let archive = emptyArchive()
    for (let index = 0; index < MAX_ARCHIVED_SESSIONS + 5; index += 1) {
      archive = appendSession(archive, { ...session(), startedAt: index })
    }

    expect(archive.sessions).toHaveLength(MAX_ARCHIVED_SESSIONS)
    expect(archive.sessions[0].startedAt).toBe(5)
  })
})

describe('buildTrend', () => {
  it('样本不足的组不进趋势', () => {
    const archive: Archive = {
      ...emptyArchive(),
      sessions: [session(10), session(30)],
    }

    expect(buildTrend(archive, 'tap')).toHaveLength(1)
  })

  it('保留时间顺序，并带上 ICPM 与正确率', () => {
    const archive: Archive = {
      ...emptyArchive(),
      sessions: [session(30), session(30)],
    }

    const trend = buildTrend(archive, 'tap')

    expect(trend).toHaveLength(2)
    expect(trend[0].icpm).toBeCloseTo(30, 5)
    expect(trend[0].accuracy).toBe(100)
    expect(trend[0].selfReported).toBe(false)
  })

  it('必须按通道过滤 —— 把 tap 和 type 画在同一条趋势上等于在比较不可比的东西', () => {
    const archive: Archive = {
      ...emptyArchive(),
      sessions: [session(30, 60_000, 'tap'), session(30, 60_000, 'type')],
    }

    expect(buildTrend(archive, 'tap')).toHaveLength(1)
    expect(buildTrend(archive, 'type')).toHaveLength(1)
    expect(buildTrend(archive, 'speak')).toHaveLength(0)
  })

  it('通道不一致的档案不会混进趋势（session 说 type、事件说 tap）', () => {
    // persist 层会直接拒绝这种档案；万一它绕过来了，趋势层也不会把两边的数混算。
    const inconsistent: Archive = {
      ...emptyArchive(),
      sessions: [{ ...session(30, 60_000, 'tap'), channel: 'type' }],
    }

    expect(buildTrend(inconsistent, 'type')).toHaveLength(0)
    expect(buildTrend(inconsistent, 'tap')).toHaveLength(0)
  })

  it('自评通道的趋势会标明自评', () => {
    const archive: Archive = { ...emptyArchive(), sessions: [session(30, 60_000, 'speak')] }

    const trend = buildTrend(archive, 'speak')
    expect(trend).toHaveLength(1)
    expect(trend[0].selfReported).toBe(true)
    // 自评没有机器可信的响应区间，所以不产生速度指标（趋势只有 icpm / accuracy）
    expect(trend[0].icpm).toBeCloseTo(30, 5)
  })
})

describe('导出 / 导入', () => {
  it('导出后能原样导入回来', () => {
    const archive: Archive = { ...emptyArchive(), sessions: [session()] }
    const raw = exportArchiveFile(archive)
    const restored = importArchiveFile(raw)

    expect(restored?.sessions).toHaveLength(1)
    expect(restored?.sessions[0].events).toEqual(archive.sessions[0].events)
  })

  it('导出会盖上时间戳，但不动事件日志', () => {
    const raw = exportArchiveFile(emptyArchive())
    const parsed = JSON.parse(raw) as Archive
    expect(parsed.version).toBe(ARCHIVE_VERSION)
    expect(parsed.exportedAt).toBeGreaterThan(0)
  })

  it('垃圾文件返回 null，不抛异常', () => {
    expect(importArchiveFile('不是 json')).toBeNull()
    expect(importArchiveFile('{"version":999}')).toBeNull()
  })
})

describe('loadState', () => {
  it('没存过就返回默认值，且不算降级', () => {
    installStorage()
    const result = loadState('kana-recognition')
    expect(result.state).toEqual(defaultState('kana-recognition'))
    expect(result.degraded).toBe(false)
  })

  it('损坏的 JSON 标记为降级，而不是静默重置', () => {
    installStorage({ 'oshinogo.v1': '{ 这不是 json' })
    const result = loadState('kana-recognition')
    expect(result.degraded).toBe(true)
    expect(result.state.archive.sessions).toEqual([])
  })

  it('档案结构不对时标记降级', () => {
    installStorage({ 'oshinogo.v1': JSON.stringify({ theme: 'dark', archive: { nope: true } }) })
    const result = loadState('kana-recognition')
    expect(result.degraded).toBe(true)
  })

  it('主题不认识时回退 system，但档案仍然保留', () => {
    const archive: Archive = { ...emptyArchive(), sessions: [session()] }
    installStorage({ 'oshinogo.v1': JSON.stringify({ theme: 'neon', archive }) })

    const result = loadState('kana-recognition')
    expect(result.state.theme).toBe('system')
    expect(result.state.archive.sessions).toHaveLength(1)
  })

  it('存了再读是同一份', () => {
    installStorage()
    const state = { theme: 'dark' as const, archive: { ...emptyArchive(), sessions: [session()] } }

    expect(saveState(state)).toBe(true)
    expect(loadState('kana-recognition').state).toEqual(state)
  })

  it('localStorage 抛异常时返回 false 而不是崩溃（无痕模式）', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('已禁用')
        },
        setItem: () => {
          throw new Error('配额已满')
        },
      },
    })

    expect(saveState(defaultState('kana-recognition'))).toBe(false)
    expect(loadState('kana-recognition').degraded).toBe(true)
  })
})
