import { ChevronLeft, ChevronRight, Keyboard } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'

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
import { cn, formatMs } from '@/lib/utils'

interface RecognitionPanelProps {
  preferences: RecognitionPreferences
  onPreferencesChange: (next: RecognitionPreferences | ((current: RecognitionPreferences) => RecognitionPreferences)) => void
}

export function RecognitionPanel({ preferences, onPreferencesChange }: RecognitionPanelProps) {
  const {
    activeSets,
    answer,
    current,
    feedback,
    lastSessionSummary,
    lifetimeStats,
    logPage,
    pagedLogs,
    progress,
    reactionMs,
    scriptMode,
    sessionIndex,
    sessionSize,
    stats,
    statsLabel,
    summary,
    summaryOpen,
    totalPages,
    masteryReached,
    setAnswer,
    setLogPage,
    setScriptMode,
    setSessionSize,
    setSummaryOpen,
    startNewSession,
    submitAnswer,
    skipQuestion,
    toggleKanaSet,
  } = useRecognitionSession({ preferences, onPreferencesChange })

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

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>① 乱序认读训练（形 → 音）</CardTitle>
                <CardDescription>
                  随机给出单个假名，不允许顺推，练到看到就能瞬间说出 romaji。
                </CardDescription>
              </div>
              <Badge className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                当前第 {Math.min(sessionIndex, sessionSize)}/{sessionSize} 题
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <KanaFilterBar activeSets={activeSets} onToggle={toggleKanaSet} />
              <ScriptModeSwitch value={scriptMode} onChange={setScriptMode} />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
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

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
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
                    className="flex h-10 w-full rounded-full border border-input bg-background px-4 py-2 text-sm"
                    type="number"
                    min={10}
                    max={500}
                    step={10}
                    value={sessionSize}
                    onChange={(event) => setSessionSize(Number(event.target.value) || 50)}
                  />
                </div>

                <Button className="w-full" onClick={() => startNewSession(sessionSize)}>
                  开始新一组
                </Button>

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
          </CardContent>
        </Card>

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
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>本组答题日志</CardTitle>
            <CardDescription>记录本组所有题目的对错、输入和反应时间。</CardDescription>
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

      <SessionSummaryDialog open={summaryOpen} onOpenChange={setSummaryOpen} summary={summary} />
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
