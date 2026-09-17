import { useCallback, useMemo, useState, type ReactNode } from 'react'

import {
  METRIC_SUPPORT,
  type ArchivedSession,
  type SessionConfig,
  type SessionState,
} from '@/kernel'

import { cn } from './cn'
import { ResponseArea } from './ResponseArea'
import { ResultCard } from './ResultCard'
import type { TrendPoint } from './storage'
import { useDrillSession } from './useDrillSession'

interface DrillProps {
  sessionConfig: SessionConfig
  trend: readonly TrendPoint[]
  header?: ReactNode
  /** 转发给结果卡（设置面板）。 */
  resultExtra?: ReactNode
  onFinish: (session: ArchivedSession) => void
  onRestart: () => void
}

/**
 * 一屏一题。
 *
 * R0：不滚动、无确认按钮、作答区在拇指区、禁掉浏览器手势干扰。
 * 作答区的形状由通道决定（tap 选项网格 / type 输入框 / speak 自评）。
 */
export function Drill({ sessionConfig, trend, header, resultExtra, onFinish, onRestart }: DrillProps) {
  const handleFinish = useCallback(
    (state: SessionState) => {
      const timed =
        sessionConfig.durationMs !== null && state.startedAt !== null && state.endedAt !== null

      onFinish({
        startedAt: state.startedAt ?? 0,
        endedAt: state.endedAt,
        durationMs: timed ? (state.endedAt as number) - (state.startedAt as number) : null,
        channel: sessionConfig.spec.channel,
        events: state.events,
      })
    },
    [onFinish, sessionConfig.durationMs, sessionConfig.spec.channel],
  )

  const session = useDrillSession(sessionConfig, handleFinish)
  const [draft, setDraft] = useState('')

  const lastEvent = session.lastEvent

  // 正确答案由 itemId + spec 推出来，不需要往事件日志里塞冗余字段。
  const lastExpected = useMemo(() => {
    if (!lastEvent) {
      return null
    }

    const item = sessionConfig.pool.find((candidate) => candidate.id === lastEvent.itemId)
    return item ? sessionConfig.spec.expectOf(item) : null
  }, [lastEvent, sessionConfig])

  const currentExpected = session.current
    ? sessionConfig.spec.expectOf(session.current)
    : null

  const submitTyped = useCallback(
    (text: string) => {
      if (!text.trim()) {
        return
      }

      session.submitText(text)
      setDraft('')
    },
    [session],
  )

  if (session.phase === 'finished') {
    return (
      <ResultCard
        summary={session.summary}
        trend={trend}
        extra={resultExtra}
        onRestart={onRestart}
      />
    )
  }

  const support = METRIC_SUPPORT[session.channel]
  const timerLabel =
    session.remainingMs === null
      ? `已练 ${Math.round(session.elapsedMs / 1000)}s`
      : `${Math.ceil(session.remainingMs / 1000)}s`

  return (
    <div className="relative flex screen-dvh select-none flex-col touch-manipulation">
      {lastEvent ? (
        <div
          key={session.answeredCount}
          className={cn(
            'pointer-events-none absolute inset-0',
            lastEvent.ok ? 'flash-right' : 'flash-wrong',
          )}
        />
      ) : null}

      <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-xs text-muted-foreground">
        <span className="tabular-nums">{timerLabel}</span>
        <span className="tabular-nums">
          {session.summary.icpm.toFixed(1)} 个/分 · {support.machineGraded ? '' : '自评 '}
          {session.summary.accuracy.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">{header}</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full text-center">
          <div className="break-all text-[clamp(4.5rem,30vw,11rem)] font-semibold leading-none tracking-tight">
            {session.current?.prompt ?? ''}
          </div>
          <div className="mt-4 min-h-6 text-sm text-muted-foreground">
            {lastEvent ? (
              lastEvent.ok ? (
                <span className="text-[hsl(var(--right))]">
                  ✓{support.reactionTime && lastEvent.tResponse !== null
                    ? ` ${Math.round(lastEvent.tResponse - lastEvent.tOnset)} ms`
                    : ''}
                </span>
              ) : (
                <span className="text-[hsl(var(--wrong))]">✗ 正确答案：{lastExpected ?? '—'}</span>
              )
            ) : null}
          </div>
        </div>
      </main>

      <ResponseArea
        channel={session.channel}
        options={session.options}
        expected={currentExpected}
        prompt={session.current?.prompt ?? null}
        draft={draft}
        onDraftChange={setDraft}
        onTap={session.answer}
        onType={submitTyped}
        onSelfReport={session.selfReport}
        onSkip={session.skip}
        onStop={session.stop}
      />
    </div>
  )
}
