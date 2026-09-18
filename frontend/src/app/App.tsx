import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { KANA_SETS, KANA_SET_LABELS, type KanaSet } from '@/drills/kana/kana'
import { dictationSpec, selectPool, speakSpec, tapSpec, typeSpec } from '@/drills/kana/specs'
import {
  DEFAULT_SCHEDULE,
  buildItemHistory,
  computeLifetime,
  metricSupportFor,
  rankSlowest,
  rankWeakest,
  type ArchivedSession,
  type DrillSpec,
  type SessionConfig,
} from '@/kernel'

import { cn } from './cn'
import { Drill } from './Drill'
import { StatsPanel, type PriorRow, type RecentRow } from './StatsPanel'
import { localDayKey, wallClockNow } from './clock'
import { createSeed } from './seed'
import {
  appendSession,
  buildTrend,
  exportArchiveFile,
  importArchiveFile,
  loadState,
  saveState,
  type StoredState,
} from './storage'
import { useTheme } from './theme'
import {
  DRILLS,
  DRILL_LABELS,
  hasChoices,
  parseDrillUrl,
  toSearch,
  type DrillId,
  type DrillUrl,
} from './urlConfig'

const SPRINT_OPTIONS = [30, 60, 120, 0] as const
const CHOICE_OPTIONS = [2, 3, 4, 6] as const
const SCRIPT_OPTIONS = [
  { value: 'hiragana', label: '平假名' },
  { value: 'katakana', label: '片假名' },
  { value: 'both', label: '混合' },
] as const
const RECENT_LIMIT = 20

const DRILL_ID = 'kana'

/** drill 决定了刺激、作答通道与 onset 来源三者，所以 spec 由它派生。 */
function specFor(config: DrillUrl): DrillSpec {
  if (config.drill === 'type') {
    return typeSpec()
  }

  if (config.drill === 'speak') {
    return speakSpec()
  }

  if (config.drill === 'listen') {
    return dictationSpec(config.choiceSize)
  }

  return tapSpec(config.choiceSize)
}

function App() {
  const [initial] = useState(() => loadState(DRILL_ID))
  const [store, setStore] = useState<StoredState>(initial.state)
  const [storageWarning, setStorageWarning] = useState(initial.degraded)

  /**
   * 落盘只在**事件处理器**里发生，不在 effect 里。
   *
   * 两个原因：在 effect 里 setState 会造成级联渲染；在 effect 里落盘会在挂载时
   * 白写一次，还把持久化与渲染时机耦合起来。
   *
   * ref 镜像最新的 store，让处理器不必依赖闭包里的旧值，
   * 同时避免「在 setState 的 updater 里做副作用」这个反模式。
   */
  const storeRef = useRef<StoredState>(initial.state)
  const commit = useCallback((next: StoredState) => {
    storeRef.current = next
    setStore(next)

    if (!saveState(next)) {
      setStorageWarning(true)
    }
  }, [])

  const [config, setConfig] = useState<DrillUrl>(() => parseDrillUrl(window.location.search))
  // seed 就是「这一组」的身份：换一组 = 换 seed，不需要额外的 runId 计数器。
  const [seed, setSeed] = useState(createSeed)
  // 墙钟只取一次：它只用来算「连续天数」，不需要随渲染跳动。
  const [nowAtMount] = useState(wallClockNow)

  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}${toSearch(config)}`)
  }, [config])

  const setTheme = useCallback(
    (theme: StoredState['theme']) => {
      commit({ ...storeRef.current, theme })
    },
    [commit],
  )
  const { toggle: toggleTheme } = useTheme(store.theme, setTheme)

  const toggleSound = useCallback(() => {
    commit({ ...storeRef.current, sound: !storeRef.current.sound })
  }, [commit])

  const spec = useMemo(() => specFor(config), [config])
  const support = useMemo(() => metricSupportFor(spec.channel, spec.onset), [spec])
  const pool = useMemo(() => selectPool(config.sets, config.script), [config.sets, config.script])

  /**
   * 跨场次历史 —— 调度器的先验。
   *
   * 范围是 drill，不是通道：点选认读与听音选字的通道都是 tap，
   * 但难度不同。没有它，每一组都只是孤立的一次测量。
   */
  const history = useMemo(
    () =>
      buildItemHistory(store.archive, spec.id, {
        // 不测速度的 drill 只能按准确率毕业，否则这些项永远无法毕业
        graduateRt: support.reactionTime ? undefined : null,
      }),
    [store.archive, spec.id, support.reactionTime],
  )

  const sessionConfig = useMemo<SessionConfig>(
    () => ({
      pool,
      spec,
      schedule: DEFAULT_SCHEDULE,
      // 不测吞吐的 drill 强制不限时：给一个不可比的时钟只会误导。
      durationMs:
        support.throughput && config.sprintSeconds > 0 ? config.sprintSeconds * 1000 : null,
      trialCap: null,
      seed,
      prior: history.byItem,
    }),
    [pool, spec, support.throughput, config.sprintSeconds, seed, history.byItem],
  )

  const trend = useMemo(
    () => buildTrend(store.archive, spec.id, support),
    [store.archive, spec.id, support],
  )

  const lifetime = useMemo(
    () => computeLifetime(store.archive, spec.id, localDayKey, nowAtMount),
    [store.archive, spec.id, nowAtMount],
  )

  const labelOf = useCallback(
    (itemId: string) => {
      const item = pool.find((candidate) => candidate.id === itemId)
      return item ? { glyph: item.prompt, answer: spec.expectOf(item) } : null
    },
    [pool, spec],
  )

  const weakest = useMemo<PriorRow[]>(
    () =>
      rankWeakest(history, pool).flatMap((prior) => {
        const label = labelOf(prior.itemId)
        return label
          ? [
              {
                itemId: prior.itemId,
                ...label,
                detail: `${Math.round(prior.accuracy * 100)}% · ${prior.attempts} 次`,
              },
            ]
          : []
      }),
    [history, pool, labelOf],
  )

  const slowest = useMemo<PriorRow[]>(
    () =>
      rankSlowest(history, pool).flatMap((prior) => {
        const label = labelOf(prior.itemId)
        return label
          ? [
              {
                itemId: prior.itemId,
                ...label,
                detail: `${Math.round(prior.medianRt)} ms · ${prior.attempts} 次`,
              },
            ]
          : []
      }),
    [history, pool, labelOf],
  )

  const recent = useMemo<RecentRow[]>(() => {
    const finished = [...store.archive.sessions].reverse().find((item) => item.drillId === spec.id)
    if (!finished) {
      return []
    }

    return finished.events
      .slice(-RECENT_LIMIT)
      .reverse()
      .flatMap((event) => {
        const label = labelOf(event.itemId)
        return label
          ? [{ itemId: event.itemId, ...label, ok: event.ok, given: event.response }]
          : []
      })
  }, [store.archive, spec.id, labelOf])

  const handleFinish = useCallback(
    (session: ArchivedSession) => {
      const current = storeRef.current
      commit({ ...current, archive: appendSession(current.archive, session) })
    },
    [commit],
  )

  const restart = useCallback(() => setSeed(createSeed()), [])

  const handleExport = useCallback(() => {
    const blob = new Blob([exportArchiveFile(storeRef.current.archive)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `oshinogo-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleImport = useCallback(
    (file: File) => {
      void file.text().then((raw) => {
        const archive = importArchiveFile(raw)
        if (!archive) {
          setStorageWarning(true)
          return
        }

        commit({ ...storeRef.current, archive })
      })
    },
    [commit],
  )

  const header = (
    <>
      <button
        type="button"
        onPointerDown={toggleSound}
        aria-label={store.sound ? '关闭音效' : '打开音效'}
        className="px-2 py-1"
      >
        {store.sound ? '🔊' : '🔇'}
      </button>
      <button type="button" onPointerDown={toggleTheme} className="px-2 py-1 underline">
        {store.theme === 'system' ? '跟随' : store.theme === 'dark' ? '夜' : '日'}
      </button>
    </>
  )

  // 设置放在结果卡里，而不是挤进 drill 的头部：
  // 一屏一题的空间不该被一堆开关占掉，而「看到成绩 → 调难度 → 再来一组」
  // 本来就是一个自然的循环。
  const settings = (
    <div className="space-y-5">
      <Group label="练什么">
        {DRILLS.map((drill) => (
          <Chip
            key={drill}
            active={config.drill === drill}
            onClick={() => setConfig((current) => withDrill(current, drill))}
          >
            {DRILL_LABELS[drill]}
          </Chip>
        ))}
      </Group>

      <Group label="题库">
        {KANA_SETS.map((set) => (
          <Chip
            key={set}
            active={config.sets.includes(set)}
            onClick={() => setConfig((current) => toggleSet(current, set))}
          >
            {KANA_SET_LABELS[set]}
          </Chip>
        ))}
      </Group>

      <Group label="文字">
        {SCRIPT_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            active={config.script === option.value}
            onClick={() => setConfig((current) => ({ ...current, script: option.value }))}
          >
            {option.label}
          </Chip>
        ))}
      </Group>

      {/* 选项数只对带选项集的 drill 有意义 */}
      {hasChoices(config.drill) ? (
        <Group label="选项数">
          {CHOICE_OPTIONS.map((size) => (
            <Chip
              key={size}
              active={config.choiceSize === size}
              onClick={() => setConfig((current) => ({ ...current, choiceSize: size }))}
            >
              {size}
            </Chip>
          ))}
        </Group>
      ) : null}

      {/* 时长只对测吞吐的 drill 有意义 */}
      {support.throughput ? (
        <Group label="时长">
          {SPRINT_OPTIONS.map((seconds) => (
            <Chip
              key={seconds}
              active={config.sprintSeconds === seconds}
              onClick={() => setConfig((current) => ({ ...current, sprintSeconds: seconds }))}
            >
              {seconds === 0 ? '不限' : `${seconds}s`}
            </Chip>
          ))}
        </Group>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">
          这个 drill 不计时。出声用的是系统语音播报，它的播放起点无法可靠得知，
          所以「反应时间」和「个/分」都测不准 —— 与其显示一个不可比的数字，不如不显示。
          它仍然计入正确率。
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="underline" />
        <button type="button" onClick={handleExport} className="underline">
          导出档案
        </button>
        <label className="cursor-pointer underline">
          导入档案
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                handleImport(file)
              }
            }}
          />
        </label>
        <span>
          {store.archive.sessions.filter((item) => item.drillId === spec.id).length} 组已归档（当前
          drill）
        </span>
      </div>

      {storageWarning ? (
        <p className="text-xs leading-5 text-wrong">
          浏览器拒绝本地保存（无痕模式或配额已满）。现在可以练，但刷新就会丢。建议导出档案。
        </p>
      ) : null}
    </div>
  )

  const resultExtra = (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-muted/20 p-4">
        <StatsPanel
          lifetime={lifetime}
          showSlowest={support.reactionTime}
          weakest={weakest}
          slowest={slowest}
          recent={recent}
          questionIsAudio={spec.modality === 'audio'}
        />
      </div>
      <div className="rounded-2xl border bg-muted/20 p-4">{settings}</div>
    </div>
  )

  return (
    <Drill
      key={`${toSearch(config)}#${seed}`}
      sessionConfig={sessionConfig}
      trend={trend}
      header={header}
      resultExtra={resultExtra}
      soundEnabled={store.sound}
      onFinish={handleFinish}
      onRestart={restart}
    />
  )
}

/**
 * 换 drill 时把选项数复位到默认（打字/朗读不使用选项集），
 * 并丢弃历史参数 `ch` —— 统一以 `drill` 为准。
 */
function withDrill(config: DrillUrl, drill: DrillId): DrillUrl {
  return { ...config, drill, choiceSize: hasChoices(drill) ? 4 : config.choiceSize }
}

function toggleSet(config: DrillUrl, set: KanaSet): DrillUrl {
  const active = config.sets.includes(set)
  if (active && config.sets.length === 1) {
    return config
  }

  const next = active ? config.sets.filter((item) => item !== set) : [...config.sets, set]
  return { ...config, sets: KANA_SETS.filter((item) => next.includes(item)) }
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-sm',
        active ? 'border-foreground bg-foreground text-background' : 'border-border bg-card',
      )}
    >
      {children}
    </button>
  )
}

export default App
