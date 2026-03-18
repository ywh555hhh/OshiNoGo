import { History, ListChecks } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDateTime, formatMs, formatPercent } from '@/lib/utils'
import type { StoredSessionReview } from '@/types/training'

interface SessionSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: StoredSessionReview
  history?: StoredSessionReview[]
}

export function SessionSummaryDialog({ open, onOpenChange, summary, history = [] }: SessionSummaryDialogProps) {
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)

  const selectedReview = useMemo(() => {
    if (selectedReviewId) {
      return history.find((item) => item.id === selectedReviewId) ?? summary
    }

    return summary
  }, [history, selectedReviewId, summary])

  const visibleHistory = useMemo(
    () => history.filter((item) => item.id !== summary.id),
    [history, summary.id],
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setSelectedReviewId(null)
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        className="max-w-5xl"
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
            顶部保留摘要和 Top 项，下面可以滚动查看完整统计；已完成的训练组也会留在右侧历史里，方便回看。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/25 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <Badge className="bg-primary/10 text-primary">{selectedReview.sessionSize} 题 / 组</Badge>
                <span>完成时间：{formatDateTime(selectedReview.completedAt)}</span>
                {selectedReview.id === summary.id ? (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">当前报告</Badge>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryItem label="总题数" value={`${selectedReview.total} 题`} />
              <SummaryItem label="正确 / 错误" value={`${selectedReview.correct} / ${selectedReview.wrong}`} />
              <SummaryItem label="准确率" value={formatPercent(selectedReview.accuracy)} />
              <SummaryItem label="平均反应" value={selectedReview.total ? `${formatMs(selectedReview.averageMs)} ms` : '-'} />
              <SummaryItem
                label="最快 / 最慢"
                value={
                  selectedReview.bestMs != null && selectedReview.worstMs != null
                    ? `${formatMs(selectedReview.bestMs)} / ${formatMs(selectedReview.worstMs)} ms`
                    : '-'
                }
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SummaryList
                title="易错假名"
                empty="本组没有明显易错项。"
                items={selectedReview.weakest.map((item) => `${item.kana} (${item.romaji}) · 正确率 ${formatPercent(item.accuracy)} · 平均 ${formatMs(item.averageMs)} ms`)}
              />
              <SummaryList
                title="反应最慢"
                empty="本组样本太少，暂时看不出最慢项。"
                items={selectedReview.slowest.map((item) => `${item.kana} (${item.romaji}) · 平均 ${formatMs(item.averageMs)} ms · 共 ${item.total} 题`)}
              />
            </div>

            <div className="rounded-2xl border">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <h4 className="text-sm font-semibold">完整统计</h4>
                  <p className="text-sm text-muted-foreground">下面保留整组 breakdown，可滚动查看全部假名表现。</p>
                </div>
                <Badge className="bg-secondary text-secondary-foreground">{selectedReview.breakdown.length} 项</Badge>
              </div>
              <ScrollArea className="h-[320px]">
                <div className="space-y-3 p-4 pr-5">
                  {selectedReview.breakdown.length ? (
                    selectedReview.breakdown.map((item) => (
                      <div key={`${selectedReview.id}-${item.kana}`} className="rounded-2xl border bg-background/70 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-semibold">{item.kana}</div>
                            <div className="text-sm text-muted-foreground">{item.romaji}</div>
                          </div>
                          <Badge className={item.accuracy >= 100 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}>
                            {formatPercent(item.accuracy)}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                          <div>作答：{item.total} 次</div>
                          <div>正确 / 错误：{item.correct} / {item.wrong}</div>
                          <div>平均：{formatMs(item.averageMs)} ms</div>
                          <div>
                            最快 / 最慢：
                            {item.bestMs != null && item.worstMs != null
                              ? `${formatMs(item.bestMs)} / ${formatMs(item.worstMs)} ms`
                              : '-'}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">当前还没有足够样本生成完整统计。</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="rounded-2xl border border-pink-400/20 bg-pink-400/10 p-4 text-sm leading-6 text-pink-700 dark:text-pink-200">
              彩蛋提醒：这里分析的是 kana 的瞬时反应，但你脑内如果突然联想到 Kana，也算一种专属 buff。
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <History className="h-4 w-4" />
              训练回顾
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              会保留最近完成的若干组，点一条就能切换查看详细报告。
            </p>

            <div className="mt-4 space-y-3">
              <Button variant={selectedReview.id === summary.id ? 'default' : 'outline'} className="w-full justify-start" onClick={() => setSelectedReviewId(summary.id)}>
                <ListChecks className="h-4 w-4" />
                当前这组
              </Button>

              <ScrollArea className="h-[360px] pr-1">
                <div className="space-y-2">
                  {visibleHistory.length ? (
                    visibleHistory.map((review) => (
                      <button
                        key={review.id}
                        type="button"
                        onClick={() => setSelectedReviewId(review.id)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${selectedReview.id === review.id ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/50'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-foreground">{formatDateTime(review.completedAt)}</div>
                          <Badge className="bg-secondary text-secondary-foreground">{review.sessionSize} 题</Badge>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          准确率 {formatPercent(review.accuracy)} · 平均 {formatMs(review.averageMs)} ms
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          正确 / 错误：{review.correct} / {review.wrong}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-2xl border bg-background px-3 py-4 text-sm text-muted-foreground">
                      还没有历史训练组，先完整做完一组，回顾栏就会积累起来。
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
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
