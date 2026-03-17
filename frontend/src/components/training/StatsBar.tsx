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
    <Card className="border-dashed bg-muted/35 shadow-none">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {highlight ? (
            <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
              {highlight}
            </Badge>
          ) : null}
        </div>

        <div className="space-y-2" aria-label={progressLabel}>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progressLabel}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} aria-label={progressLabel} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
