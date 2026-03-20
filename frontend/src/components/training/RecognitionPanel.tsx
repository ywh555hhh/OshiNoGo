import { AlertTriangle, ChevronLeft, ChevronRight, FileText, Info, Keyboard } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { TRAINING_HINT_COPY } from '@/content/siteCopy'
import { KanaFilterBar } from '@/components/training/KanaFilterBar'
import { LogTable } from '@/components/training/LogTable'
import { ScriptModeSwitch } from '@/components/training/ScriptModeSwitch'
import { SessionSummaryDialog } from '@/components/training/SessionSummaryDialog'
import { StatsBar } from '@/components/training/StatsBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { RecognitionPreferences } from '@/hooks/useAppPreferences'
import { useRecognitionSession } from '@/hooks/useRecognitionSession'
import { useSpeechCapability } from '@/hooks/useSpeechCapability'
import type { RecognitionAnswerFeedbackMode } from '@/types/training'
import { cn, formatDateTime, formatMs, formatPercent } from '@/lib/utils'

interface RecognitionPanelProps {
  preferences: RecognitionPreferences
  onPreferencesChange: (next: RecognitionPreferences | ((current: RecognitionPreferences) => RecognitionPreferences)) => void
}

const FEEDBACK_MODE_COPY: Record<RecognitionAnswerFeedbackMode, { label: string; description: string }> = {
  'result-sound': {
    label: '正误音效',
    description: '保持当前训练节奏',
  },
  'speak-kana': {
    label: '读出假名',
    description: '提交后朗读这一题的正确假名',
  },
}

export function RecognitionPanel({ preferences, onPreferencesChange }: RecognitionPanelProps) {
  const {
    activeSets,
    answer,
    current,
    feedback,
    hasSessionReports,
    lastSessionSummary,
    latestSessionReview,
    lifetimeStats,
    logPage,
    openLatestReport,
    pagedLogs,
    progress,
    reactionMs,
    reportOpen,
    reportSummary,
    scriptMode,
    sessionIndex,
    sessionReviews,
    sessionSize,
    stats,
    statsLabel,
    submitFeedbackMessage,
    totalPages,
    masteryReached,
    closeReport,
    setAnswer,
    setLogPage,
    setScriptMode,
    setSessionSize,
    startNewSession,
    submitAnswer,
    skipQuestion,
    toggleKanaSet,
  } = useRecognitionSession({ preferences, onPreferencesChange })
  const { capability, isLimited, isUnsupported } = useSpeechCapability()
  const [sessionSizeInput, setSessionSizeInput] = useState(String(sessionSize))

  useEffect(() => {
    setSessionSizeInput(String(sessionSize))
  }, [sessionSize])

  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [current])

  const feedbackClassName = useMemo(
    () =>
      cn('min-h-6 text-sm', {
        'text-emerald-600 dark:text-emerald-300': feedback.tone === 'success',
        'text-rose-600 dark:text-rose-300': feedback.tone === 'error',
        'text-muted-foreground': feedback.tone === 'info' || feedback.tone === 'idle',
      }),
    [feedback.tone],
  )

  const speechHintClassName = useMemo(
    () =>
      cn('rounded-2xl border p-3 text-xs leading-5', {
        'border-amber-400/30 bg-amber-400/10 text-amber-900 dark:text-amber-100': isLimited,
        'border-rose-400/30 bg-rose-400/10 text-rose-900 dark:text-rose-100': isUnsupported,
        'border-muted bg-muted/20 text-muted-foreground': !isLimited && !isUnsupported,
      }),
    [isLimited, isUnsupported],
  )

  function setAnswerFeedbackMode(mode: RecognitionAnswerFeedbackMode): void {
    onPreferencesChange((currentPreferences) => ({
      ...currentPreferences,
      answerFeedbackMode: mode,
    }))
  }

  const isDakuonActive = activeSets.includes('dakuon')

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">① 乱序认读训练（形 → 音）</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              随机给出单个假名，不允许顺推，练到看到就能瞬间说出 romaji。
            </p>
          </div>
          <Badge className="rounded-full bg-primary/10 px-3 py-1 text-primary">
            当前第 {Math.min(sessionIndex, sessionSize)}/{sessionSize} 题
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="min-w-0">
            <KanaFilterBar activeSets={activeSets} onToggle={toggleKanaSet} />
          </div>
          <div className="min-w-0">
            <ScriptModeSwitch value={scriptMode} onChange={setScriptMode} />
          </div>
          <div className="min-w-0 space-y-2 md:col-span-2 xl:col-span-1">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">提交后反馈</div>
              <p className="text-xs leading-5 text-muted-foreground">只影响 Enter / 确认；跳过不受影响。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['result-sound', 'speak-kana'] as RecognitionAnswerFeedbackMode[]).map((mode) => {
                const option = FEEDBACK_MODE_COPY[mode]
                const selected = preferences.answerFeedbackMode === mode
                return (
                  <Button
                    key={mode}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setAnswerFeedbackMode(mode)}
                    aria-pressed={selected}
                    title={option.description}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        {preferences.answerFeedbackMode === 'speak-kana' ? (
          <div className="space-y-2 md:max-w-3xl">
            <div className={speechHintClassName}>
              <div className="flex items-start gap-2 font-medium">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <div>{capability.label}</div>
                  <div className={cn('mt-1 font-normal', isLimited || isUnsupported ? 'text-current/85' : 'text-muted-foreground')}>
                    {capability.hint}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-4 sm:gap-y-1">
              {submitFeedbackMessage ? <p className="text-xs leading-5 text-muted-foreground">{submitFeedbackMessage}</p> : null}
              {isUnsupported ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  当前浏览器无法直接朗读时，提交后会自动回退到正误音效，避免反馈静默失效。
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {isDakuonActive ? (
          <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm leading-6 text-sky-900 dark:text-sky-100">
            <div className="flex items-start gap-2 font-medium">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{TRAINING_HINT_COPY.recognition}</p>
            </div>
          </div>
        ) : null}

        <div className="rounded-[1.75rem] border bg-muted/30 p-6 text-center sm:p-8">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">current kana</div>
          <div className="mt-4 text-[4rem] font-semibold leading-none sm:text-[5.5rem]">{current?.kana ?? '—'}</div>
          <div className="mt-4 text-sm text-muted-foreground">当前反应计时：{formatMs(reactionMs)} ms</div>
        </div>

        <div className="space-y-3">
          <label htmlFor="rec-input" className="text-sm font-medium text-muted-foreground">
            罗马音
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="rec-input"
              ref={inputRef}
              className="flex h-10 w-full rounded-full border border-input bg-background px-4 py-2 text-sm"
              placeholder="例如：a / ka / shi"
              autoComplete="off"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  submitAnswer()
                }
              }}
            />
            <Button onClick={submitAnswer}>确认</Button>
            <Button variant="outline" onClick={skipQuestion}>
              跳过
            </Button>
          </div>
          <div className={feedbackClassName} aria-live="polite" role="status">
            {feedback.message || '输入后按 Enter 提交。'}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-3 rounded-[1.5rem] border bg-muted/20 p-4 sm:grid-cols-2">
            <RecentStat label="累计已答" value={`${lifetimeStats.total}`} />
            <RecentStat
              label="最近一组"
              value={lastSessionSummary ? `${lastSessionSummary.accuracy.toFixed(1)}% · ${Math.round(lastSessionSummary.averageMs)} ms` : '还没有完整摘要'}
            />
          </div>

          <div className="space-y-4 rounded-[1.75rem] border bg-background p-4">
            <div className="space-y-2">
              <label htmlFor="rec-session-size" className="text-sm font-medium text-muted-foreground">
                本组题量
              </label>
              <input
                id="rec-session-size"
                type="number"
                className="flex h-10 w-full rounded-full border border-input bg-background px-4 py-2 text-sm"
                min={10}
                max={500}
                inputMode="numeric"
                value={sessionSizeInput}
                onChange={(event) => {
                  const value = event.target.value
                  setSessionSizeInput(value)

                  const parsed = Number(value)
                  if (Number.isInteger(parsed) && parsed >= 10 && parsed <= 500) {
                    setSessionSize(parsed)
                  }
                }}
                onBlur={() => {
                  const parsed = Number(sessionSizeInput)
                  if (!Number.isFinite(parsed)) {
                    setSessionSizeInput(String(sessionSize))
                    return
                  }

                  const clamped = Math.min(500, Math.max(10, Math.round(parsed)))
                  setSessionSize(clamped)
                  setSessionSizeInput(String(clamped))
                }}
              />
            </div>

            <Button className="w-full" onClick={() => startNewSession(sessionSize)}>
              开始新一组
            </Button>

            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4" />
                训练报告
              </div>

              {hasSessionReports && latestSessionReview ? (
                <div className="mt-3 space-y-3 text-sm">
                  <div className="rounded-2xl border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">最近完成</div>
                      <Badge className="bg-secondary text-secondary-foreground">{latestSessionReview.sessionSize} 题</Badge>
                    </div>
                    <div className="mt-2 font-medium text-foreground">
                      {formatPercent(latestSessionReview.accuracy)} · 平均 {formatMs(latestSessionReview.averageMs)} ms
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      正确 / 错误：{latestSessionReview.correct} / {latestSessionReview.wrong}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">完成时间：{formatDateTime(latestSessionReview.completedAt)}</div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={openLatestReport}>
                    查看训练报告
                  </Button>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-sm leading-6 text-muted-foreground">完成一整组后可查看最近记录，入口会一直留在这里，方便随时回看。</p>
                  <Button variant="outline" className="w-full" disabled>
                    查看训练报告
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-dashed p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Keyboard className="h-4 w-4" />
                键盘操作
              </div>
              <ul className="mt-2 space-y-1">
                <li>Enter：提交答案</li>
                <li>输入框自动聚焦，连打更顺手</li>
                <li>跳过也会计入统计</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <StatsBar
          title="当前组统计"
          description={statsLabel}
          progress={progress}
          progressLabel={`本组进度：${stats.total}/${sessionSize} 题`}
          accuracy={stats.accuracy}
          averageMs={stats.averageMs}
          total={stats.total}
          correct={stats.correct}
          highlight={masteryReached ? '达标：准确率 ≥ 98%，平均反应 ≤ 500ms' : undefined}
        />
        <StatsBar
          title="累计统计"
          description="只保留基础累计指标，不保存无限增长日志。"
          progress={Math.min((lifetimeStats.total / 1000) * 100, 100)}
          progressLabel={`累计练习：${lifetimeStats.total} 题`}
          accuracy={lifetimeStats.accuracy}
          averageMs={lifetimeStats.averageMs}
          total={lifetimeStats.total}
          correct={lifetimeStats.correct}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>本组答题日志</CardTitle>
            <CardDescription>记录本组所有题目的对错、输入和反应时间；一页 50 条，卡片内可以直接上下滑动查看。</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLogPage(Math.max(1, logPage - 1))} disabled={logPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLogPage(Math.min(totalPages, logPage + 1))} disabled={logPage >= totalPages}>
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <LogTable logs={pagedLogs} page={logPage} totalPages={totalPages} emptyMessage="这一组还没有答题记录，先完成几题再回来复盘。" />
        </CardContent>
      </Card>

      <SessionSummaryDialog open={reportOpen} onOpenChange={(open) => (!open ? closeReport() : undefined)} summary={reportSummary} history={sessionReviews} />
    </div>
  )
}

function RecentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  )
}
