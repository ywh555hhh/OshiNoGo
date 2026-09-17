import { describe, expect, it } from 'vitest'

import { ARCHIVE_VERSION, deserializeArchive, serializeArchive, type Archive } from '../persist'

const archive: Archive = {
  version: ARCHIVE_VERSION,
  drillId: 'kana-recognition',
  exportedAt: 1_700_000_000_000,
  sessions: [
    {
      startedAt: 1000,
      endedAt: 61_000,
      durationMs: 60_000,
      events: [
        { itemId: 'a-hira', tOnset: 1000, tResponse: 1400, response: 'a', ok: true, reason: 'correct' },
        { itemId: 'ka-hira', tOnset: 2000, tResponse: null, response: null, ok: false, reason: 'skipped' },
      ],
    },
  ],
}

describe('档案 —— 导出/导入', () => {
  it('往返序列化不丢信息', () => {
    const restored = deserializeArchive(serializeArchive(archive))
    expect(restored).toEqual(archive)
  })

  it('导出文件就是事件日志本身 —— 不需要第二套格式', () => {
    const parsed = JSON.parse(serializeArchive(archive)) as Archive
    expect(parsed.sessions[0].events[0]).toEqual(archive.sessions[0].events[0])
  })
})

describe('档案 —— 严格校验（宁可拒绝，绝不猜）', () => {
  it('不是 JSON → null，不抛异常', () => {
    expect(deserializeArchive('这不是 json')).toBeNull()
    expect(deserializeArchive('')).toBeNull()
  })

  it('版本不匹配 → null（不做未声明的猜测性迁移）', () => {
    const wrong = JSON.stringify({ ...archive, version: ARCHIVE_VERSION + 1 })
    expect(deserializeArchive(wrong)).toBeNull()
  })

  it('缺少 drillId 或 exportedAt → null', () => {
    expect(deserializeArchive(JSON.stringify({ ...archive, drillId: '' }))).toBeNull()

    const withoutTimestamp: Record<string, unknown> = { ...archive }
    delete withoutTimestamp.exportedAt
    expect(deserializeArchive(JSON.stringify(withoutTimestamp))).toBeNull()
  })

  it('sessions 不是数组 → null', () => {
    expect(deserializeArchive(JSON.stringify({ ...archive, sessions: {} }))).toBeNull()
  })

  it('事件里的 reason 不认识 → 整个档案拒绝，而不是留下半截坏数据', () => {
    const broken = {
      ...archive,
      sessions: [
        {
          ...archive.sessions[0],
          events: [{ ...archive.sessions[0].events[0], reason: 'banana' }],
        },
      ],
    }
    expect(deserializeArchive(JSON.stringify(broken))).toBeNull()
  })

  it('事件字段类型不对 → null', () => {
    const broken = {
      ...archive,
      sessions: [
        {
          ...archive.sessions[0],
          events: [{ ...archive.sessions[0].events[0], tOnset: 'soon' }],
        },
      ],
    }
    expect(deserializeArchive(JSON.stringify(broken))).toBeNull()
  })

  it('空档案是合法的', () => {
    const empty: Archive = {
      version: ARCHIVE_VERSION,
      drillId: 'kana-recognition',
      exportedAt: 1,
      sessions: [],
    }
    expect(deserializeArchive(serializeArchive(empty))).toEqual(empty)
  })
})
