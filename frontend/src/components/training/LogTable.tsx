import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatClock, formatMs } from '@/lib/utils'
import type { RecognitionLogEntry } from '@/types/training'

interface LogTableProps {
  logs: RecognitionLogEntry[]
  page: number
  totalPages: number
  emptyMessage?: string
}

export function LogTable({ logs, page, totalPages, emptyMessage = '这一页还没有记录。' }: LogTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>本组答题日志（最新在上）</div>
        <div>第 {page}/{totalPages} 页</div>
      </div>
      <div className="rounded-2xl border">
        <div className="border-b px-4 py-3 text-xs text-muted-foreground sm:hidden">手机上可左右滑动查看完整表格。</div>
        <ScrollArea className="max-h-[360px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>假名</TableHead>
                <TableHead>正确罗马音</TableHead>
                <TableHead>你的输入</TableHead>
                <TableHead>结果</TableHead>
                <TableHead>反应时间</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length ? (
                logs.map((log, index) => (
                  <TableRow key={`${log.timestamp}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="text-lg font-semibold">{log.kana}</TableCell>
                    <TableCell>{log.romaji}</TableCell>
                    <TableCell>{log.input || '-'}</TableCell>
                    <TableCell>
                      <Badge className={log.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'}>
                        {log.ok ? '✔ 正确' : '✗ 错误'}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.reactionMs != null ? `${formatMs(log.reactionMs)} ms` : '-'}</TableCell>
                    <TableCell>{formatClock(log.timestamp)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  )
}
