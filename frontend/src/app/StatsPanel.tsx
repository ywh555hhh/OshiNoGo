import type { LifetimeStats } from '@/kernel'

/**
 * 累计统计 + 易错/最慢榜 + 最近几题。
 *
 * 这是补上一个真实倒退的地方：重构时我把整套统计展示删了、又没有替代，
 * 于是「哪些假名我最弱」和「我总共练了多少」这两件学习者最想知道的事
 * 一度完全消失。数据其实一直在档案里，只是没人去聚合。
 *
 * 面板刻意保持简单：一个数值格 + 两个榜单 + 一段紧凑的最近记录。
 * 不做分页表格、不做弹窗——那些是给开发者看的。
 */

export interface PriorRow {
  itemId: string
  /** 题面（假名字形）。音频 drill 的题面是声音，调用方传空。 */
  glyph: string
  answer: string
  detail: string
}

export interface RecentRow {
  itemId: string
  glyph: string
  answer: string
  ok: boolean
  given: string | null
}

interface StatsPanelProps {
  lifetime: LifetimeStats
  /** 这个 drill 是否测速度。不测就不显示最慢榜，避免暗示一个不存在的指标。 */
  showSlowest: boolean
  weakest: readonly PriorRow[]
  slowest: readonly PriorRow[]
  recent: readonly RecentRow[]
  /** 音频 drill：题面要显示成「听音」而不是假名（否则等于提前泄露答案）。 */
  questionIsAudio: boolean
}

export function StatsPanel({
  lifetime,
  showSlowest,
  weakest,
  slowest,
  recent,
  questionIsAudio,
}: StatsPanelProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">累计</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Figure label="练过" value={`${lifetime.trials}`} unit="题" />
          <Figure label="组数" value={`${lifetime.sessions}`} unit="组" />
          <Figure
            label="正确率"
            value={lifetime.trials ? lifetime.accuracy.toFixed(0) : '—'}
            unit={lifetime.trials ? '%' : ''}
          />
          <Figure
            label="连续"
            value={`${lifetime.streakDays}`}
            unit={lifetime.streakDays > 0 ? '天' : ''}
          />
        </div>
        {lifetime.activeDays > 0 ? (
          <p className="text-xs text-muted-foreground">
            累计练习 {lifetime.activeDays} 天
            {lifetime.firstAt ? `（自 ${formatDay(lifetime.firstAt)} 起）` : ''}
          </p>
        ) : lifetime.trials > 0 ? (
          <p className="text-xs text-muted-foreground">
            这一版之前记录的组没有留下墙钟时间，所以天数统计从零开始算。
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">最容易错</h3>
        <RankList
          rows={weakest}
          questionIsAudio={questionIsAudio}
          empty="还没有足够样本。同一个假名至少答 3 次才会进榜。"
        />
      </section>

      {showSlowest ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">反应最慢</h3>
          <RankList rows={slowest} questionIsAudio={questionIsAudio} empty="还没有足够样本。" />
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">这一组（最新在上）</h3>
        {recent.length ? (
          <ul className="divide-y rounded-2xl border">
            {recent.map((row, index) => (
              <li
                key={`${row.itemId}-${index}`}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <span className={row.ok ? 'text-correct' : 'text-wrong'}>{row.ok ? '✓' : '✗'}</span>
                <span className="text-muted-foreground">{questionIsAudio ? '🔊' : row.glyph}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold">{row.answer}</span>
                {!row.ok && row.given ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    你答了 {questionIsAudio ? row.given : row.given}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">这一组没有记录。</p>
        )}
      </section>
    </div>
  )
}

function Figure({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 tabular-nums">
        <span className="text-xl font-semibold">{value}</span>
        {unit ? <span className="ml-0.5 text-xs text-muted-foreground">{unit}</span> : null}
      </div>
    </div>
  )
}

function RankList({
  rows,
  empty,
  questionIsAudio,
}: {
  rows: readonly PriorRow[]
  empty: string
  questionIsAudio: boolean
}) {
  if (!rows.length) {
    return <p className="text-xs leading-5 text-muted-foreground">{empty}</p>
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.itemId}
          className="flex items-center gap-3 rounded-2xl border bg-background px-3 py-2"
        >
          <span className="text-lg font-semibold">{questionIsAudio ? '🔊' : row.glyph}</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-base font-semibold">{row.answer}</span>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">{row.detail}</span>
        </li>
      ))}
    </ul>
  )
}

function formatDay(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}
