import { useCallback, useMemo, type ReactNode } from 'react'

import type { ArchivedSession, SessionConfig, SessionState } from '@/kernel'

import { cn } from './cn'
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

/** Tailwind 看不到动态类名，映射必须是静态字面量，否则会被 purge 掉。 */
const COLUMN_CLASS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

function columnsFor(count: number): string {
  if (count <= 4) {
    return COLUMN_CLASS[2]
  }

  return count <= 6 ? COLUMN_CLASS[3] : COLUMN_CLASS[4]
}

/**
 * 一屏一题。
 *
 * R0：不滚动、无确认按钮、点按即提交、选项在拇指区、禁掉浏览器手势干扰。
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
        events: state.events,
      })
    },
    [onFinish, sessionConfig.durationMs],
  )

  const session = useDrillSession(sessionConfig, handleFinish)
  const lastEvent = session.lastEvent

  // 正确答案由 itemId + spec 推出来，不需要往事件日志里塞冗余字段。
  const lastExpected = useMemo(() => {
    if (!lastEvent) {
      return null
    }

    const item = sessionConfig.pool.find((candidate) => candidate.id === lastEvent.itemId)
    return item ? sessionConfig.spec.expectOf(item) : null
  }, [lastEvent, sessionConfig])

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
          {session.summary.icpm.toFixed(1)} 个/分 · {session.summary.accuracy.toFixed(0)}%
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
                  ✓ {Math.round((lastEvent.tResponse ?? 0) - lastEvent.tOnset)} ms
                </span>
              ) : (
                <span className="text-[hsl(var(--wrong))]">✗ 正确答案：{lastExpected ?? '—'}</span>
              )
            ) : null}
          </div>
        </div>
      </main>

      <footer className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className={cn('grid gap-3', columnsFor(session.options.length))}>
          {session.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onPointerDown={() => session.answer(option.id)}
              className="h-16 rounded-2xl border border-border bg-card text-2xl font-semibold text-foreground transition active:scale-[0.97] active:bg-muted sm:h-20"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button type="button" onPointerDown={session.skip} className="px-2 py-2 underline">
            跳过
          </button>
          <button type="button" onPointerDown={session.stop} className="px-2 py-2 underline">
            结束
          </button>
        </div>
      </footer>
    </div>
  )
}
