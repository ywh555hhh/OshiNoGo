/**
 * 档案的序列化边界。
 *
 * 已定的档案方案是「共享一份档案 + 可选导出/导入文件」。
 * 因为 R2 规定事件日志是唯一真相，所以**导出文件就是事件日志本身**，
 * 不需要另建一套导出格式——这也是为什么这个模块能这么短。
 *
 * 校验策略：宁可拒绝，绝不猜。损坏/陌生的数据一律返回 null，
 * 由调用方决定怎么提示，不允许在解析层抛异常。
 */

import { RESPONSE_CHANNELS } from './channels'
import type { GradeReason, ResponseChannel, TrialEvent } from './types'

/**
 * v1 → v2：v1 只有 tap 一个通道（`ResponseChannel` 是 v2 才引入的概念），
 * 所以 v1 的档案里缺 `channel` 时补 'tap' 不是猜测，而是对 v1 能力的确定性陈述。
 * 这也是唯一一处允许默认填充的地方。
 */
export const ARCHIVE_VERSION = 2

const SUPPORTED_VERSIONS: readonly number[] = [1, 2]

export interface ArchivedSession {
  startedAt: number
  endedAt: number | null
  durationMs: number | null
  /** 这一组走的是哪个作答通道。趋势图必须按通道分组，不可混画。 */
  channel: ResponseChannel
  events: TrialEvent[]
}

export interface Archive {
  version: number
  drillId: string
  exportedAt: number
  sessions: ArchivedSession[]
}

const GRADE_REASONS: readonly GradeReason[] = [
  'correct',
  'equivalent',
  'wrong',
  'empty',
  'skipped',
  'timeout',
  'self-pass',
  'self-fail',
]

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

function isResponseChannel(value: unknown): value is ResponseChannel {
  return RESPONSE_CHANNELS.some((channel) => channel === value)
}

function parseTrialEvent(value: unknown): TrialEvent | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<TrialEvent>

  if (typeof candidate.itemId !== 'string' || !candidate.itemId) {
    return null
  }
  if (!isFiniteNumber(candidate.tOnset)) {
    return null
  }
  if (!isNullableNumber(candidate.tResponse)) {
    return null
  }
  if (candidate.response !== null && typeof candidate.response !== 'string') {
    return null
  }
  if (typeof candidate.ok !== 'boolean') {
    return null
  }
  if (!GRADE_REASONS.includes(candidate.reason as GradeReason)) {
    return null
  }
  // 缺 channel 视为 v1（只有 tap）；给了但非法则拒绝。
  if (candidate.channel !== undefined && !isResponseChannel(candidate.channel)) {
    return null
  }

  return {
    itemId: candidate.itemId,
    tOnset: candidate.tOnset,
    tResponse: candidate.tResponse ?? null,
    response: candidate.response ?? null,
    ok: candidate.ok,
    reason: candidate.reason as GradeReason,
    channel: isResponseChannel(candidate.channel) ? candidate.channel : 'tap',
  }
}

function parseSession(value: unknown): ArchivedSession | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<ArchivedSession>
  if (!isFiniteNumber(candidate.startedAt)) {
    return null
  }
  if (!isNullableNumber(candidate.endedAt)) {
    return null
  }
  if (!isNullableNumber(candidate.durationMs)) {
    return null
  }
  if (!Array.isArray(candidate.events)) {
    return null
  }
  if (candidate.channel !== undefined && !isResponseChannel(candidate.channel)) {
    return null
  }

  const events: TrialEvent[] = []
  for (const raw of candidate.events) {
    const event = parseTrialEvent(raw)
    if (!event) {
      return null
    }
    events.push(event)
  }

  const channel: ResponseChannel = isResponseChannel(candidate.channel) ? candidate.channel : 'tap'

  // 完整性检查：一组的通道声明必须与它每条事件的通道一致。
  // 不一致说明档案被改过或写坏了，这种数据不能进趋势图。
  if (events.some((event) => event.channel !== channel)) {
    return null
  }

  return {
    startedAt: candidate.startedAt,
    endedAt: candidate.endedAt ?? null,
    durationMs: candidate.durationMs ?? null,
    channel,
    events,
  }
}

export function serializeArchive(archive: Archive): string {
  return JSON.stringify(archive)
}

/** 损坏或版本不支持一律返回 null，不抛异常。 */
export function deserializeArchive(raw: string): Archive | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const candidate = parsed as Partial<Archive>
  if (typeof candidate.version !== 'number' || !SUPPORTED_VERSIONS.includes(candidate.version)) {
    return null
  }
  if (typeof candidate.drillId !== 'string' || !candidate.drillId) {
    return null
  }
  if (!isFiniteNumber(candidate.exportedAt)) {
    return null
  }
  if (!Array.isArray(candidate.sessions)) {
    return null
  }

  const sessions: ArchivedSession[] = []
  for (const raw of candidate.sessions) {
    const session = parseSession(raw)
    if (!session) {
      return null
    }
    sessions.push(session)
  }

  // 读进来的一律升到当前版本，导出时不再区分来源版本。
  return {
    version: ARCHIVE_VERSION,
    drillId: candidate.drillId,
    exportedAt: candidate.exportedAt,
    sessions,
  }
}
