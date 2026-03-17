import { useRef } from 'react'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatMs } from '@/lib/utils'
import type { RecognitionSummary } from '@/types/training'

interface SessionSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: RecognitionSummary
}

export function SessionSummaryDialog({ open, onOpenChange, summary }: SessionSummaryDialogProps) {
  const titleRef = useRef<HTMLHeadingElement | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          titleRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle ref={titleRef} tabIndex={-1}>
            本组训练报告
          </DialogTitle>
          <DialogDescription>
            这一组的整体表现、易错项和最慢项都会汇总在这里。关闭后仍会保留最近一次摘要和累计统计。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryItem label="总题数" value={`${summary.total} 题`} />
          <SummaryItem label="正确 / 错误" value={`${summary.correct} / ${summary.wrong}`} />
          <SummaryItem label="准确率" value={`${summary.accuracy.toFixed(1)}%`} />
          <SummaryItem label="平均反应" value={summary.total ? `${formatMs(summary.averageMs)} ms` : '-'} />
          <SummaryItem
            label="最快 / 最慢"
            value={summary.bestMs != null && summary.worstMs != null ? `${formatMs(summary.bestMs)} / ${formatMs(summary.worstMs)} ms` : '-'}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SummaryList
            title="易错假名"
            empty="本组没有明显易错项。"
            items={summary.weakest.map((item) => `${item.kana} (${item.romaji}) · 正确率 ${item.accuracy.toFixed(1)}% · 平均 ${formatMs(item.averageMs)} ms`)}
          />
          <SummaryList
            title="反应最慢"
            empty="本组样本太少，暂时看不出最慢项。"
            items={summary.slowest.map((item) => `${item.kana} (${item.romaji}) · 平均 ${formatMs(item.averageMs)} ms · 共 ${item.total} 题`)}
          />
        </div>

        <div className="rounded-2xl border border-pink-400/20 bg-pink-400/10 p-4 text-sm leading-6 text-pink-700 dark:text-pink-200">
          彩蛋提醒：这里分析的是 kana 的瞬时反应，但你脑内如果突然联想到 Kana，也算一种专属 buff。
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-muted/40 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  )
}

function SummaryList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Badge className="bg-secondary text-secondary-foreground">Top 5</Badge>
      </div>
      {items.length ? (
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="rounded-xl bg-muted/40 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  )
}
