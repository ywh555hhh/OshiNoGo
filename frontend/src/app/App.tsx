import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { KANA_SETS, KANA_SET_LABELS, type KanaSet } from '@/drills/kana/kana'
import { RECOGNITION_SPEC_ID, recognitionSpec, selectPool } from '@/drills/kana/recognition'
import { DEFAULT_SCHEDULE, type ArchivedSession, type SessionConfig } from '@/kernel'

import { cn } from './cn'
import { Drill } from './Drill'
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
import { configKey, parseDrillUrl, toSearch, type DrillUrl } from './urlConfig'

const SPRINT_OPTIONS = [30, 60, 120, 0] as const
const CHOICE_OPTIONS = [2, 3, 4, 6] as const
const SCRIPT_OPTIONS = [
  { value: 'hiragana', label: '平假名' },
  { value: 'katakana', label: '片假名' },
  { value: 'both', label: '混合' },
] as const

function App() {
  const [initial] = useState(() => loadState(RECOGNITION_SPEC_ID))
  const [store, setStore] = useState<StoredState>(initial.state)
  const [storageWarning, setStorageWarning] = useState(initial.degraded)

  /**
   * 落盘只在**事件处理器**里发生，不在 effect 里。
   *
   * 两个原因：
   * - 在 effect 里 setState 会造成级联渲染；
   * - 在 effect 里落盘会在挂载时白写一次，还把持久化与渲染时机耦合起来。
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

  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}${toSearch(config)}`)
  }, [config])

  const setTheme = useCallback(
    (theme: StoredState['theme']) => {
      commit({ ...storeRef.current, theme })
    },
    [commit],
  )
  const { toggle } = useTheme(store.theme, setTheme)

  const sessionConfig = useMemo<SessionConfig>(
    () => ({
      pool: selectPool(config.sets, config.script),
      spec: recognitionSpec(config.choiceSize),
      schedule: DEFAULT_SCHEDULE,
      durationMs: config.sprintSeconds > 0 ? config.sprintSeconds * 1000 : null,
      trialCap: null,
      seed,
    }),
    [config, seed],
  )

  const trend = useMemo(() => buildTrend(store.archive), [store.archive])

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

  const themeButton = (
    <button type="button" onPointerDown={toggle} className="px-2 py-1 underline">
      {store.theme === 'system' ? '跟随系统' : store.theme === 'dark' ? '夜间' : '日间'}
    </button>
  )

  // 设置放在结果卡里，而不是挤进 drill 的头部：
  // 一屏一题的空间不该被 8 个开关占掉，而「看到成绩 → 调难度 → 再来一组」
  // 本来就是一个自然的循环。
  const settings = (
    <div className="space-y-5">
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
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
        <span>{store.archive.sessions.length} 组已归档</span>
      </div>

      {storageWarning ? (
        <p className="text-xs leading-5 text-[hsl(var(--wrong))]">
          浏览器拒绝本地保存（无痕模式或配额已满）。现在可以练，但刷新就会丢。建议导出档案。
        </p>
      ) : null}
    </div>
  )

  return (
    <Drill
      key={`${configKey(config)}#${seed}`}
      sessionConfig={sessionConfig}
      trend={trend}
      header={themeButton}
      resultExtra={settings}
      onFinish={handleFinish}
      onRestart={restart}
    />
  )
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
