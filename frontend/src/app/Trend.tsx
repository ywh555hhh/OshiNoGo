import type { TrendPoint } from './storage'

/**
 * 趋势。
 *
 * 这是替代 275 行「训练报告弹窗」的东西：precision teaching 看的是
 * celeration（学习速率），而不是某一组的漂亮数字。一排柱子就够了。
 */
export function Trend({ points }: { points: readonly TrendPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        再练几组就能看到趋势。单组数字意义有限，趋势才说明有没有在变快。
      </p>
    )
  }

  const max = Math.max(...points.map((point) => point.icpm), 1)
  const first = points[0].icpm
  const last = points[points.length - 1].icpm
  const delta = first > 0 ? ((last - first) / first) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between text-xs text-muted-foreground">
        <span>最近 {points.length} 组 · 个/分</span>
        <span className={delta >= 0 ? 'text-correct' : 'text-wrong'}>
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(0)}%
        </span>
      </div>

      <div className="flex h-14 items-end gap-1">
        {points.map((point) => (
          <div
            key={point.at}
            title={`${point.icpm.toFixed(1)} 个/分 · ${point.accuracy.toFixed(0)}%`}
            className="flex-1 rounded-t bg-foreground/25"
            style={{ height: `${Math.max(8, (point.icpm / max) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  )
}
