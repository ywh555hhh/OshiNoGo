import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatMs } from '@/lib/utils'

interface StatsBarProps {
  title: string
  description: string
  progress: number
  progressLabel: string
  accuracy: number
  averageMs: number
  total: number
  correct: number
  highlight?: string
}

export function StatsBar({
  title,
  description,
  progress,
  progressLabel,
  accuracy,
  averageMs,
  total,
  correct,
  highlight,
}: StatsBarProps) {
  return (
    <Card className="border-dashed bg-muted/30 shadow-none">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          {highlight ? (
            <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
              {highlight}
            </Badge>
          ) : null}
        </div>

        <div className="space-y-2" aria-label={progressLabel}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
            <span>{progressLabel}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" aria-label={progressLabel} />
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatItem label="已答" value={`${total}`} />
          <StatItem label="正确" value={`${correct}`} />
          <StatItem label="准确率" value={`${accuracy.toFixed(1)}%`} />
          <StatItem label="平均反应" value={`${formatMs(averageMs)} ms`} />
        </div>
      </CardContent>
    </Card>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold" aria-label={`${label} ${value}`}>
        {value}
      </div>
    </div>
  )
}
