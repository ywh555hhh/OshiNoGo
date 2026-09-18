import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import type { ArchivedSession, SessionConfig, SessionState, TrialEvent } from '@/kernel'

import { cn } from './cn'
import { ResponseArea } from './ResponseArea'
import { ResultCard } from './ResultCard'
import { playResultSound } from './sound'
import { speakReference } from './speakReference'
import type { TrendPoint } from './storage'
import { useDrillSession } from './useDrillSession'

interface DrillProps {
  sessionConfig: SessionConfig
  trend: readonly TrendPoint[]
  header?: ReactNode
  /** 转发给结果卡（统计面板 + 设置）。 */
  resultExtra?: ReactNode
  soundEnabled: boolean
  onFinish: (session: ArchivedSession) => void
  onRestart: () => void
}

/**
 * 一屏一题。
 *
 * R0：不滚动、无确认按钮、作答区在拇指区、禁掉浏览器手势干扰。
 * 刺激的形状由 drill 决定（字形 / 播放按钮），作答区的形状由通道决定。
 */
export function Drill({
  sessionConfig,
  trend,
  header,
  resultExtra,
  soundEnabled,
  onFinish,
  onRestart,
}: DrillProps) {
  /**
   * 墙钟起点。
   *
   * 存档里的时间戳必须是墙钟（`Date.now()`），不能是 `performance.now()`：
   * 后者从页面加载起算、每次刷新归零，拿它算「练了几天 / 连续天数」是错的。
   * kernel 不允许读时钟，所以这一层由 app 负责。
   */
  const startedAtWall = useRef<number | null>(null)

  useEffect(() => {
    startedAtWall.current = Date.now()
  }, [])

  const handleFinish = useCallback(
    (state: SessionState) => {
      const endedAtWall = Date.now()
      const timed =
        sessionConfig.durationMs !== null && state.startedAt !== null && state.endedAt !== null

      onFinish({
        startedAt: startedAtWall.current ?? endedAtWall,
        endedAt: endedAtWall,
        // 时长仍用 kernel 的单调时钟差：它测的是「应用内经过了多少」，
        // 不受页面被挂到后台影响。
        durationMs: timed ? (state.endedAt as number) - (state.startedAt as number) : null,
        drillId: sessionConfig.spec.id,
        channel: sessionConfig.spec.channel,
        events: state.events,
      })
    },
    [onFinish, sessionConfig.durationMs, sessionConfig.spec.channel, sessionConfig.spec.id],
  )

  const session = useDrillSession(sessionConfig, handleFinish)
  const [draft, setDraft] = useState('')
  const answeredCount = session.answeredCount
  const lastOk = session.lastEvent?.ok ?? null
  const isAudio = sessionConfig.spec.modality === 'audio'

  // 正误音效。放在 effect 里是因为「对错」由 kernel 判定，
  // 响应处理器里还不知道结果（不能自己去复刻一遍判分）。
  useEffect(() => {
    if (answeredCount === 0 || lastOk === null || !soundEnabled) {
      return
    }

    playResultSound(lastOk)
  }, [answeredCount, lastOk, soundEnabled])

  /**
   * 上一题的「回执」。
   *
   * 关键：**题面必须在回执里**。kernel 在作答瞬间就推进到下一题了
   * （刻意的：零点按推进才有干净节拍），所以中央那个大假名已经是下一题；
   * 只写「正确答案：ka」会看起来贴在下一题上。
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

  const support = session.summary.support
  const timerLabel =
    session.remainingMs === null
      ? `已练 ${Math.round(session.elapsedMs / 1000)}s`
      : `${Math.ceil(session.remainingMs / 1000)}s`

  return (
    <div className="relative flex screen-dvh select-none flex-col touch-manipulation">
      {session.lastEvent ? (
        <div
          key={answeredCount}
          className={cn(
            'pointer-events-none absolute inset-0',
            session.lastEvent.ok ? 'flash-correct' : 'flash-wrong',
          )}
        />
      ) : null}

      <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-xs text-muted-foreground">
        <span className="tabular-nums">{timerLabel}</span>
        <span className="tabular-nums">
          {support.throughput ? `${session.summary.icpm.toFixed(1)} 个/分 · ` : ''}
          {support.machineGraded ? '' : '自评 '}
          {session.summary.accuracy.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">{header}</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full text-center">
          {isAudio ? (
            <AudioPrompt
              // 换题就重挂载，清掉「已播放」状态
              key={session.current?.id ?? 'none'}
              prompt={session.current?.prompt ?? null}
            />
          ) : (
            <div className="break-all text-[clamp(4.5rem,30vw,11rem)] font-semibold leading-none tracking-tight">
              {session.current?.prompt ?? ''}
            </div>
          )}

          {/* 固定高度：有/无回执时中央内容不会跳位 */}
          <div className="mt-5 flex min-h-[3.25rem] items-start justify-center">
            {receipt ? (
              <div
                key={answeredCount}
                className={cn(
                  'inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border px-3 py-2',
                  receipt.ok ? 'border-correct/30 bg-correct/10' : 'border-wrong/30 bg-wrong/10',
                )}
              >
                <span className="text-xs text-muted-foreground">上一题</span>
                <span className="text-xl font-semibold leading-none">
                  {isAudio ? '🔊' : receipt.prompt}
                </span>
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
function receiptDetail(
  event: TrialEvent,
  channel: SessionConfig['spec']['channel'],
): string | null {
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

/**
 * 听音 drill 的刺激：一个播放按钮。
 *
 * 用 speechSynthesis 出声 —— 这**不违反** R1：这个 drill 的 `onset` 是
 * `audio-unknown`，所以它根本不产出速度指标，也就不存在「onset 不可知所以不能测」
 * 的问题。我们要的只是它响，不需要知道它何时响。
 *
 * 必须在点击（用户手势）里调用，否则 iOS / 微信不会出声。
 */
function AudioPrompt({ prompt }: { prompt: string | null }) {
  const [plays, setPlays] = useState(0)
  const [unsupported, setUnsupported] = useState(false)

  function play() {
    if (!prompt) {
      return
    }

    setUnsupported(speakReference(prompt) === 'unsupported')
    setPlays((value) => value + 1)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={play}
        disabled={!prompt}
        aria-label="播放这个音"
        className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-border bg-card text-5xl transition active:scale-[0.96] active:bg-muted"
      >
        🔊
      </button>
      <p className="text-sm text-muted-foreground">
        {unsupported
          ? '这台设备没有日语语音，听不了这一项'
          : plays === 0
            ? '点一下听这个音'
            : '没听清就再点一次'}
      </p>
    </div>
  )
}

export default Drill
