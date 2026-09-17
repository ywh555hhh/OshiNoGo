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

import type { GradeReason, TrialEvent } from './types'

export const ARCHIVE_VERSION = 1

export interface ArchivedSession {
  startedAt: number
  endedAt: number | null
  durationMs: number | null
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
]

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
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

  return {
    itemId: candidate.itemId,
    tOnset: candidate.tOnset,
    tResponse: candidate.tResponse ?? null,
    response: candidate.response ?? null,
    ok: candidate.ok,
    reason: candidate.reason as GradeReason,
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

  const events: TrialEvent[] = []
  for (const raw of candidate.events) {
    const event = parseTrialEvent(raw)
    if (!event) {
      return null
    }
    events.push(event)
  }

  return {
    startedAt: candidate.startedAt,
    endedAt: candidate.endedAt ?? null,
    durationMs: candidate.durationMs ?? null,
    events,
  }
}

export function serializeArchive(archive: Archive): string {
  return JSON.stringify(archive)
}

/** 损坏或版本不匹配一律返回 null，不抛异常。 */
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
  if (candidate.version !== ARCHIVE_VERSION) {
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

  return {
    version: ARCHIVE_VERSION,
    drillId: candidate.drillId,
    exportedAt: candidate.exportedAt,
    sessions,
  }
}
