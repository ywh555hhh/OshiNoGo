import { useCallback, useMemo, useState, type ReactNode } from 'react'

import {
  METRIC_SUPPORT,
  type ArchivedSession,
  type ResponseChannel,
  type SessionConfig,
  type SessionState,
  type TrialEvent,
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
export function Drill({
  sessionConfig,
  trend,
  header,
  resultExtra,
  onFinish,
  onRestart,
}: DrillProps) {
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

  /**
   * 上一题的「回执」。
   *
   * 关键：**题面必须在回执里**。
   *
   * kernel 在作答的瞬间就推进到下一题了（这是刻意的：零点按推进才有干净的节拍），
   * 所以屏幕中央那个大假名已经是下一题。如果回执只写「正确答案：ka」，
   * 它会看起来贴在下一题上——一个没有题面的答案，读起来像答错了另一道题。
   *
   * 把「题面 → 正确答案」成对放进回执，这个小控件就自洽了，
   * 跟中央正在出的那一题再无关系。
   */
  const receipt = useMemo(() => {
    const event = session.lastEvent
    if (!event) {
      return null
    }

    const item = sessionConfig.pool.find((candidate) => candidate.id === event.itemId)
    if (!item) {
      return null
    }

    return {
      prompt: item.prompt,
      expected: sessionConfig.spec.expectOf(item),
      ok: event.ok,
      detail: receiptDetail(event, sessionConfig.spec.channel),
      rtMs: event.tResponse === null ? null : Math.round(event.tResponse - event.tOnset),
    }
  }, [session.lastEvent, sessionConfig])

  const currentExpected = session.current ? sessionConfig.spec.expectOf(session.current) : null

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
      {session.lastEvent ? (
        <div
          key={session.answeredCount}
          className={cn(
            'pointer-events-none absolute inset-0',
            session.lastEvent.ok ? 'flash-correct' : 'flash-wrong',
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
          {/* 固定高度：有/无回执时中央那个假名不会跳位 */}
          <div className="mt-5 flex min-h-[3.25rem] items-start justify-center">
            {receipt ? (
              <div
                key={session.answeredCount}
                className={cn(
                  'inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border px-3 py-2',
                  receipt.ok ? 'border-correct/30 bg-correct/10' : 'border-wrong/30 bg-wrong/10',
                )}
              >
                <span className="text-xs text-muted-foreground">上一题</span>
                <span className="text-xl font-semibold leading-none">{receipt.prompt}</span>
                <span className="text-muted-foreground">→</span>
                <span
                  className={cn(
                    'text-lg font-semibold leading-none',
                    receipt.ok ? 'text-correct' : 'text-wrong',
                  )}
                >
                  {receipt.expected}
                </span>

                {receipt.detail ? (
                  <span className="text-xs text-muted-foreground">{receipt.detail}</span>
                ) : null}

                {support.reactionTime && receipt.rtMs !== null ? (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {receipt.rtMs}ms
                  </span>
                ) : null}
              </div>
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

/** 回执右侧那句补充说明：为什么错。 */
function receiptDetail(event: TrialEvent, channel: ResponseChannel): string | null {
  if (event.reason === 'skipped') {
    return '已跳过'
  }

  if (event.ok) {
    return null
  }

  // 「你答了 sa」比单纯一个 ✗ 有用得多：它区分了「不会」和「和 sa 搞混了」。
  if (event.response) {
    return `你答了 ${event.response}`
  }

  return channel === 'speak' ? '没读出来' : null
}
