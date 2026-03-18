import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { KANA } from '@/data/kana'
import { getActiveKanaPool, toggleKanaSetSelection } from '@/domain/kana'
import { buildRecognitionSummary, buildSessionBreakdown, createAggregateStats, hasMetMasteryTarget } from '@/domain/stats'
import type { DictationPreferences } from '@/hooks/useAppPreferences'
import { appendSessionReview, mergeLifetimeStats } from '@/hooks/useAppPreferences'
import { clamp, formatMs, now } from '@/lib/utils'
import type {
  FeedbackState,
  KanaItem,
  KanaSet,
  RecognitionLogEntry,
  ScriptMode,
  StoredSessionReview,
} from '@/types/training'

const DEFAULT_SESSION_SIZE = 30
const LOG_PAGE_SIZE = 50

function buildPool(activeSets: KanaSet[], scriptMode: ScriptMode) {
  return getActiveKanaPool(KANA, activeSets, scriptMode)
}

function createFeedback(): FeedbackState {
  return { tone: 'info', message: '先播放假名，再立刻写出对应假名。' }
}

function randomPick<T>(items: T[], previous?: T | null) {
  if (!items.length) {
    return null
  }

  if (items.length === 1) {
    return items[0]
  }

  let next = items[Math.floor(Math.random() * items.length)]
  while (next === previous) {
    next = items[Math.floor(Math.random() * items.length)]
  }
  return next
}

interface UseDictationSessionOptions {
  preferences: DictationPreferences
  onPreferencesChange: (next: DictationPreferences | ((current: DictationPreferences) => DictationPreferences)) => void
}

export function useDictationSession({ preferences, onPreferencesChange }: UseDictationSessionOptions) {
  const [activeSets, setActiveSets] = useState<KanaSet[]>(preferences.activeSets)
  const [scriptMode, setScriptModeState] = useState<ScriptMode>(preferences.scriptMode)
  const pool = useMemo(() => buildPool(activeSets, scriptMode), [activeSets, scriptMode])
  const [current, setCurrent] = useState<KanaItem | null>(() => randomPick(pool))
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState>(createFeedback())
  const [total, setTotal] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [times, setTimes] = useState<number[]>([])
  const [reactionMs, setReactionMs] = useState(0)
  const [sessionSize, setSessionSizeState] = useState(preferences.sessionSize)
  const [logs, setLogs] = useState<RecognitionLogEntry[]>([])
  const [logPage, setLogPageState] = useState(1)
  const [summaryDismissed, setSummaryDismissed] = useState(false)
  const startTimeRef = useRef<number | null>(now())
  const currentRef = useRef<KanaItem | null>(current)
  const advanceTimerRef = useRef<number | null>(null)
  const sessionIdRef = useRef(1)
  const persistedSessionIdRef = useRef<number | null>(null)

  const stats = useMemo(() => createAggregateStats(total, correct, times), [correct, times, total])
  const masteryReached = useMemo(() => hasMetMasteryTarget(stats), [stats])
  const summary = useMemo(() => buildRecognitionSummary(logs), [logs])
  const progress = sessionSize > 0 ? Math.min((stats.total / sessionSize) * 100, 100) : 0
  const totalPages = Math.max(1, Math.ceil(logs.length / LOG_PAGE_SIZE))
  const safeLogPage = Math.min(logPage, totalPages)
  const pagedLogs = useMemo(() => {
    const start = (safeLogPage - 1) * LOG_PAGE_SIZE
    return logs.slice(start, start + LOG_PAGE_SIZE)
  }, [logs, safeLogPage])
  const summaryOpen = logs.length > 0 && total >= sessionSize && !summaryDismissed
  const lifetimeStats = useMemo(
    () =>
      createAggregateStats(
        preferences.lifetimeStats.total,
        preferences.lifetimeStats.correct,
        preferences.lifetimeStats.times,
      ),
    [preferences.lifetimeStats],
  )
  const currentReview = useMemo<StoredSessionReview>(
    () => ({
      id: 'dictation-current',
      ...summary,
      completedAt: logs[0]?.timestamp ?? preferences.lastSessionSummary?.completedAt ?? 0,
      sessionSize,
      logs: logs.slice(0, 500),
      breakdown: buildSessionBreakdown(logs),
    }),
    [logs, preferences.lastSessionSummary?.completedAt, sessionSize, summary],
  )

  useEffect(() => {
    currentRef.current = current
  }, [current])

  useEffect(() => {
    onPreferencesChange((currentPreference) => ({
      ...currentPreference,
      activeSets,
      scriptMode,
      sessionSize,
    }))
  }, [activeSets, onPreferencesChange, scriptMode, sessionSize])

  useEffect(() => {
    if (total < sessionSize || persistedSessionIdRef.current === sessionIdRef.current) {
      return
    }

    persistedSessionIdRef.current = sessionIdRef.current
    const completedAt = Date.now()
    const completedReview: StoredSessionReview = {
      id: `dictation-${completedAt}-${sessionIdRef.current}`,
      ...summary,
      completedAt,
      sessionSize,
      logs: logs.slice(0, 500),
      breakdown: buildSessionBreakdown(logs),
    }

    onPreferencesChange((currentPreference) => ({
      ...currentPreference,
      lifetimeStats: mergeLifetimeStats(currentPreference.lifetimeStats, {
        total: stats.total,
        correct: stats.correct,
        times,
      }),
      lastSessionSummary: completedReview,
      sessionReviews: appendSessionReview(currentPreference.sessionReviews, completedReview),
    }))
  }, [logs, onPreferencesChange, sessionSize, stats, summary, times, total])

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current)
      }
    }
  }, [])

  const nextQuestion = useCallback(
    (restartSession = false) => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current)
      }

      if (restartSession) {
        sessionIdRef.current += 1
        persistedSessionIdRef.current = null
        setTotal(0)
        setCorrect(0)
        setTimes([])
        setLogs([])
        setLogPageState(1)
        setSummaryDismissed(false)
        setReactionMs(0)
        setFeedback({ tone: 'info', message: '新一组已开始，先播放再作答。' })
      }

      const next = randomPick(pool, currentRef.current)
      currentRef.current = next
      setCurrent(next)
      setAnswer('')
      setReactionMs(0)
      startTimeRef.current = now()
    },
    [pool],
  )

  const playPrompt = useCallback(() => {
    if (!currentRef.current) {
      return null
    }

    if (!startTimeRef.current) {
      startTimeRef.current = now()
    }

    return currentRef.current.kana
  }, [])

  const registerLog = useCallback((ok: boolean, input: string, measuredMs: number | null) => {
    setLogs((currentLogs) => [
      {
        kana: currentRef.current?.kana ?? '-',
        romaji: currentRef.current?.romaji ?? '-',
        input,
        ok,
        reactionMs: measuredMs,
        timestamp: Date.now(),
      },
      ...currentLogs,
    ])
  }, [])

  const submitAnswer = useCallback(() => {
    if (!currentRef.current) {
      return
    }

    const input = answer.trim()
    if (!input) {
      return
    }

    const measuredMs = startTimeRef.current ? now() - startTimeRef.current : 0
    const ok = input === currentRef.current.kana
    setTotal((value) => value + 1)
    setCorrect((value) => value + (ok ? 1 : 0))
    setTimes((value) => [...value, measuredMs].slice(-200))
    setReactionMs(measuredMs)
    registerLog(ok, input, measuredMs)
    setFeedback({
      tone: ok ? 'success' : 'error',
      message: ok ? `正确：${currentRef.current.kana}` : `错误：你写的是 “${input}”，正确是 “${currentRef.current.kana}”`,
    })

    advanceTimerRef.current = window.setTimeout(() => nextQuestion(false), 360)
  }, [answer, nextQuestion, registerLog])

  const skipQuestion = useCallback(() => {
    setTotal((value) => value + 1)
    registerLog(false, '(skip)', null)
    setFeedback({ tone: 'error', message: currentRef.current ? `已跳过：正确答案是 ${currentRef.current.kana}` : '已跳过本题' })
    nextQuestion(false)
  }, [nextQuestion, registerLog])

  const toggleKanaSet = useCallback(
    (target: KanaSet) => {
      setActiveSets((currentSets) => {
        const nextSets = toggleKanaSetSelection(currentSets, target)
        const nextPool = buildPool(nextSets, scriptMode)
        const nextCurrent = randomPick(nextPool)
        currentRef.current = nextCurrent
        setCurrent(nextCurrent)
        setAnswer('')
        setReactionMs(0)
        return nextSets
      })
    },
    [scriptMode],
  )

  const setScriptMode = useCallback(
    (mode: ScriptMode) => {
      setScriptModeState(mode)
      const nextPool = buildPool(activeSets, mode)
      const nextCurrent = randomPick(nextPool)
      currentRef.current = nextCurrent
      setCurrent(nextCurrent)
      setAnswer('')
      setReactionMs(0)
    },
    [activeSets],
  )

  const setSessionSize = useCallback((value: number) => {
    setSessionSizeState(clamp(Number.isFinite(value) ? Math.round(value) : DEFAULT_SESSION_SIZE, 10, 500))
  }, [])

  const startNewSession = useCallback(
    (requestedSize = sessionSize) => {
      setSessionSizeState(clamp(Number.isFinite(requestedSize) ? Math.round(requestedSize) : DEFAULT_SESSION_SIZE, 10, 500))
      nextQuestion(true)
    },
    [nextQuestion, sessionSize],
  )

  const setLogPage = useCallback(
    (value: number) => {
      setLogPageState(Math.max(1, Math.min(value, totalPages)))
    },
    [totalPages],
  )

  const setSummaryOpen = useCallback((open: boolean) => {
    setSummaryDismissed(!open)
  }, [])

  const statsLabel = useMemo(() => {
    let text = `本组已答：${stats.total} · 正确：${stats.correct} · 准确率：${stats.accuracy.toFixed(1)}% · 平均反应：${formatMs(stats.averageMs)} ms`
    if (masteryReached) {
      text += ' · ✅ 听写已达目标线'
    }
    return text
  }, [masteryReached, stats])

  return {
    activeSets,
    answer,
    current,
    currentReview,
    feedback,
    lastSessionSummary: preferences.lastSessionSummary,
    lifetimeStats,
    logPage: safeLogPage,
    pagedLogs,
    playPrompt,
    progress,
    reactionMs,
    scriptMode,
    sessionReviews: preferences.sessionReviews,
    sessionSize,
    stats,
    statsLabel,
    summary,
    summaryOpen,
    totalPages,
    masteryReached,
    nextQuestion,
    setAnswer,
    setLogPage,
    setScriptMode,
    setSessionSize,
    setSummaryOpen,
    skipQuestion,
    startNewSession,
    submitAnswer,
    toggleKanaSet,
  }
}
