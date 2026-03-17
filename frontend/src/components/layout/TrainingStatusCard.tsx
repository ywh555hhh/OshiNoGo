import { BookOpenText, ChevronRight, RotateCcw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { StoredSessionSummary, TrainingMode } from '@/types/training'

interface TrainingStatusCardProps {
  lastMode: TrainingMode
  onboardingCompleted: boolean
  recognitionSummary: StoredSessionSummary | null
  dictationSummary: StoredSessionSummary | null
  practicedCount: number
  storageWarning: string | null
  onModeChange: (mode: TrainingMode) => void
  onOpenHelp: () => void
}

const MODE_LABELS: Record<TrainingMode, string> = {
  recognition: '乱序认读',
  dictation: '乱序听写',
  words: '单词拼读',
}

export function TrainingStatusCard({
  lastMode,
  onboardingCompleted,
  recognitionSummary,
  dictationSummary,
  practicedCount,
  storageWarning,
  onModeChange,
  onOpenHelp,
}: TrainingStatusCardProps) {
  return (
    <Card className="border-dashed bg-muted/30 shadow-none">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-primary/10 text-primary">
                {onboardingCompleted ? '继续训练' : '首次使用'}
              </Badge>
              <Badge className="rounded-full bg-background text-foreground">上次停在：{MODE_LABELS[lastMode]}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {onboardingCompleted
                ? '刷新后会恢复上次模式、主题、训练偏好与基础统计。'
                : '建议先看一遍说明，再从 recognition 开始。'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onOpenHelp}>
              <BookOpenText className="h-4 w-4" />
              查看说明
            </Button>
            <Button size="sm" onClick={() => onModeChange(lastMode)}>
              继续上次训练
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {storageWarning ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200">
            {storageWarning}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <StatusItem
            title="recognition"
            summary={recognitionSummary}
            fallback="还没有完成过一整组。"
            actionLabel="开始认读"
            onAction={() => onModeChange('recognition')}
          />
          <StatusItem
            title="dictation"
            summary={dictationSummary}
            fallback="等认读更稳后，再来听写加压。"
            actionLabel="开始听写"
            onAction={() => onModeChange('dictation')}
          />
          <div className="rounded-2xl border bg-background p-4">
            <div className="text-sm font-semibold">words</div>
            <p className="mt-2 text-sm text-muted-foreground">已累计练习 {practicedCount} 个单词，适合做轻量迁移检查。</p>
            <Button variant="ghost" size="sm" className="mt-3 px-0" onClick={() => onModeChange('words')}>
              <RotateCcw className="h-4 w-4" />
              打开单词模式
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusItem({
  title,
  summary,
  fallback,
  actionLabel,
  onAction,
}: {
  title: string
  summary: StoredSessionSummary | null
  fallback: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="text-sm font-semibold">{title}</div>
      {summary ? (
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <div>最近一组：{summary.total} 题</div>
          <div>准确率：{summary.accuracy.toFixed(1)}%</div>
          <div>平均反应：{Math.round(summary.averageMs)} ms</div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{fallback}</p>
      )}
      <Button variant="ghost" size="sm" className="mt-3 px-0" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  )
}
