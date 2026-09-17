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
      channel: 'tap',
      events: [
        {
          itemId: 'a-hira',
          tOnset: 1000,
          tResponse: 1400,
          response: 'a',
          ok: true,
          reason: 'correct',
          channel: 'tap',
        },
        {
          itemId: 'ka-hira',
          tOnset: 2000,
          tResponse: null,
          response: null,
          ok: false,
          reason: 'skipped',
          channel: 'tap',
        },
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

describe('档案 —— v1 → v2 迁移（通道是 v2 才引入的）', () => {
  /** v1 的档案：完全没有 channel 字段。 */
  const v1 = {
    version: 1,
    drillId: 'kana-recognition',
    exportedAt: 1,
    sessions: [
      {
        startedAt: 1000,
        endedAt: 2000,
        durationMs: 1000,
        events: [
          {
            itemId: 'a-hira',
            tOnset: 1000,
            tResponse: 1400,
            response: 'a',
            ok: true,
            reason: 'correct',
          },
        ],
      },
    ],
  }

  it('v1 能读进来，并补成 tap —— 这不是猜测，v1 只有 tap', () => {
    const restored = deserializeArchive(JSON.stringify(v1))

    expect(restored).not.toBeNull()
    expect(restored?.version).toBe(ARCHIVE_VERSION)
    expect(restored?.sessions[0].channel).toBe('tap')
    expect(restored?.sessions[0].events[0].channel).toBe('tap')
  })

  it('读进来的一律升级到当前版本', () => {
    const restored = deserializeArchive(JSON.stringify(v1))
    expect(restored?.version).toBe(2)
  })

  it('未知版本仍然拒绝', () => {
    expect(deserializeArchive(JSON.stringify({ ...v1, version: 99 }))).toBeNull()
  })

  it('通道不合法则拒绝（不许猜）', () => {
    const bad = JSON.parse(JSON.stringify(v1)) as typeof v1
    // @ts-expect-error 故意塞一个非法通道
    bad.sessions[0].channel = 'telepathy'
    expect(deserializeArchive(JSON.stringify(bad))).toBeNull()
  })
})

describe('档案 —— 通道完整性', () => {
  it('session 声明的通道必须与它每条事件一致', () => {
    const tampered: Archive = {
      ...archive,
      sessions: [
        {
          ...archive.sessions[0],
          channel: 'speak',
        },
      ],
    }

    expect(deserializeArchive(JSON.stringify(tampered))).toBeNull()
  })

  it('一致的 speak 档案是合法的', () => {
    const spoke: Archive = {
      version: ARCHIVE_VERSION,
      drillId: 'kana-speaking',
      exportedAt: 1,
      sessions: [
        {
          startedAt: 0,
          endedAt: 1000,
          durationMs: 1000,
          channel: 'speak',
          events: [
            {
              itemId: 'a-hira',
              tOnset: 0,
              tResponse: 900,
              response: null,
              ok: true,
              reason: 'self-pass',
              channel: 'speak',
            },
          ],
        },
      ],
    }

    expect(deserializeArchive(serializeArchive(spoke))).toEqual(spoke)
  })
})
