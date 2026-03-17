import { AlertTriangle, ChevronLeft, ChevronRight, Keyboard, SkipForward, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { KanaFilterBar } from '@/components/training/KanaFilterBar'
import { LogTable } from '@/components/training/LogTable'
import { ScriptModeSwitch } from '@/components/training/ScriptModeSwitch'
import { SessionSummaryDialog } from '@/components/training/SessionSummaryDialog'
import { StatsBar } from '@/components/training/StatsBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DictationPreferences } from '@/hooks/useAppPreferences'
import { useDictationSession } from '@/hooks/useDictationSession'
import { useSpeechCapability } from '@/hooks/useSpeechCapability'
import { speakJapanese } from '@/lib/speech'
import { cn, formatMs } from '@/lib/utils'

interface DictationPanelProps {
  preferences: DictationPreferences
  onPreferencesChange: (next: DictationPreferences | ((current: DictationPreferences) => DictationPreferences)) => void
}

export function DictationPanel({ preferences, onPreferencesChange }: DictationPanelProps) {
  const {
    activeSets,
    answer,
    current,
    feedback,
    lastSessionSummary,
    lifetimeStats,
    logPage,
    pagedLogs,
    playPrompt,
    progress,
    reactionMs,
    scriptMode,
    sessionSize,
    stats,
    statsLabel,
    summary,
    summaryOpen,
    totalPages,
    masteryReached,
    nextQuestion,
    setAnswer,
    setLogPage,
    setScriptMode,
    setSessionSize,
    setSummaryOpen,
    skipQuestion,
    startNewSession,
    submitAnswer,
    toggleKanaSet,
  } = useDictationSession({ preferences, onPreferencesChange })
  const { capability, isUnsupported } = useSpeechCapability()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [playbackFeedback, setPlaybackFeedback] = useState('')

  useEffect(() => {
    inputRef.current?.focus()
  }, [current])

  useEffect(() => {
    if (!current) {
      return
    }

    speakJapanese(current.kana)
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

  function playCurrentKana(): void {
    const kana = playPrompt()
    if (!kana) {
      setPlaybackFeedback('当前没有可播放的题目，请先开始新一组。')
      return
    }

    const playback = speakJapanese(kana)
    setPlaybackFeedback(playback.message)
  }

  function startSession(): void {
    setPlaybackFeedback('')
    startNewSession(sessionSize)
  }

  function goToNextQuestion(): void {
    setPlaybackFeedback('')
    nextQuestion(false)
  }

  function goToPreviousLogPage(): void {
    setLogPage(Math.max(1, logPage - 1))
  }

  function goToNextLogPage(): void {
    setLogPage(Math.min(totalPages, logPage + 1))
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>② 乱序听写训练（音 → 形）</CardTitle>
              <CardDescription>
                播放单个假名，立刻写出对应假名，训练音到形的瞬时映射。
              </CardDescription>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <KanaFilterBar activeSets={activeSets} onToggle={toggleKanaSet} />
              <ScriptModeSwitch value={scriptMode} onChange={setScriptMode} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-2 font-medium text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <div>{capability.label}</div>
                  <div className="text-muted-foreground">{capability.hint}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border bg-muted/30 p-6 text-center sm:p-8">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">listen and write</div>
              <div className="mt-4 flex justify-center">
                <Button size="lg" className="rounded-full px-8" onClick={playCurrentKana} disabled={isUnsupported}>
                  <Volume2 className="h-5 w-5" />
                  播放假名
                </Button>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">当前反应计时：{formatMs(reactionMs)} ms</div>
              <div className="mt-2 min-h-6 text-sm text-muted-foreground" aria-live="polite" role="status">
                {playbackFeedback || '进入新题时会自动播放；如果没听清，可以手动重播。'}
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="dic-input" className="text-sm font-medium text-muted-foreground">
                写出假名
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="dic-input"
                  ref={inputRef}
                  className="flex h-10 w-full rounded-full border border-input bg-background px-4 py-2 text-sm"
                  placeholder="例如：あ、か、し……"
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
                {feedback.message || '先播放，再输入。'}
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
                  <label htmlFor="dic-session-size" className="text-sm font-medium text-muted-foreground">
                    本组题量
                  </label>
                  <input
                    id="dic-session-size"
                    className="flex h-10 w-full rounded-full border border-input bg-background px-4 py-2 text-sm"
                    type="number"
                    min={10}
                    max={500}
                    step={10}
                    value={sessionSize}
                    onChange={(event) => setSessionSize(Number(event.target.value) || 30)}
                  />
                </div>

                <div className="rounded-2xl border border-dashed p-4 text-sm leading-6 text-muted-foreground">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Keyboard className="h-4 w-4" />
                    键盘操作
                  </div>
                  <ul className="mt-2 space-y-1">
                    <li>Enter：提交答案</li>
                    <li>播放后立刻输入，跳过也会计入统计</li>
                    <li>如果语音不稳，建议先回 recognition</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="flex-1" onClick={startSession}>
                    开始新一组
                  </Button>
                  <Button variant="outline" onClick={goToNextQuestion}>
                    <SkipForward className="h-4 w-4" />
                    换一个
                  </Button>
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
            description="刷新后会恢复累计数据和最近一次训练摘要。"
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
            <CardDescription>听写结果、输入内容和反应时间都会记录在这里。</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousLogPage} disabled={logPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextLogPage} disabled={logPage >= totalPages}>
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <LogTable logs={pagedLogs} page={logPage} totalPages={totalPages} emptyMessage="这一组还没有听写记录，先播几题再来复盘。" />
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
