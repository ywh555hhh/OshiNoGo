import type { SessionSummary } from '@/kernel'
import type { ReactNode } from 'react'

import { Trend } from './Trend'
import type { TrendPoint } from './storage'

interface ResultCardProps {
  summary: SessionSummary
  trend: readonly TrendPoint[]
  /** 追加在趋势下面的内容（设置面板）。 */
  extra?: ReactNode
  onRestart: () => void
}

const ONSET_TARGET_MS = 800

function medianLabel(summary: SessionSummary): string {
  if (summary.medianRt === null) {
    return '—'
  }

  return `${Math.round(summary.medianRt)} ms`
}

export function ResultCard({ summary, trend, extra, onRestart }: ResultCardProps) {
  const hitTarget = summary.accuracy >= 95 && summary.medianRt !== null && summary.medianRt <= ONSET_TARGET_MS

  return (
    <div className="flex h-[100dvh] flex-col overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5">
        <h1 className="text-sm uppercase tracking-[0.3em] text-muted-foreground">本组结束</h1>

        <div className="rounded-3xl border bg-card p-6 text-center">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">个/分</div>
          <div className="mt-2 text-6xl font-semibold tabular-nums">
            {summary.sufficient ? summary.icpm.toFixed(1) : '—'}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">items correct per minute</div>

          {!summary.sufficient ? (
            <p className="mt-3 text-xs text-[hsl(var(--wrong))]">
              样本不足（{summary.attempts} 题，需要 30 题以上），这一组的数字不构成结论。
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Cell label="正确率" value={`${summary.accuracy.toFixed(1)}%`} />
          <Cell label="题数" value={`${summary.attempts}`} />
          <Cell label="中位反应" value={medianLabel(summary)} />
          <Cell
            label="稳定性 CV"
            value={summary.cv === null ? '—' : summary.cv.toFixed(3)}
          />
        </div>

        {summary.medianRt !== null ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {hitTarget ? '✓ ' : ''}
            目标：正确率 ≥ 95% 且中位反应 ≤ {ONSET_TARGET_MS} ms。
            {' '}CV 越低说明越接近「自动化」而不只是「变快」。
          </p>
        ) : null}

        <details className="rounded-2xl border bg-muted/20 p-4 text-sm">
          <summary className="cursor-pointer text-muted-foreground">诊断细节</summary>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            <li>排除的抢答（&lt;150ms）：{summary.excluded.anticipation}</li>
            <li>排除的走神（&gt;5000ms）：{summary.excluded.idle}</li>
            <li>未作答（跳过）：{summary.excluded.unanswered}</li>
            <li>耗时：{(summary.elapsedMs / 1000).toFixed(1)} 秒</li>
          </ul>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            排除项是摆出来给你看的，不是静默丢弃。抢答和长时间发呆不属于「反应时间」。
          </p>
        </details>

        <div className="rounded-2xl border p-4">
          <Trend points={trend} />
        </div>

        {extra ? <div className="rounded-2xl border p-4">{extra}</div> : null}

        <button
          type="button"
          onClick={onRestart}
          className="mt-auto h-14 rounded-2xl bg-foreground text-base font-semibold text-background active:scale-[0.99]"
        >
          再来一组
        </button>
      </div>
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}
