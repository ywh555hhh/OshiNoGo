import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { KANA } from '@/data/kana'
import { getActiveKanaPool, normalizeRomaji, toggleKanaSetSelection } from '@/domain/kana'
import { buildRecSessionQueue } from '@/domain/queue'
import { buildRecognitionSummary, buildSessionBreakdown, createAggregateStats, hasMetMasteryTarget } from '@/domain/stats'
import type { RecognitionPreferences } from '@/hooks/useAppPreferences'
import { appendSessionReview, mergeLifetimeStats } from '@/hooks/useAppPreferences'
import { playResultSound } from '@/lib/audio'
import { clamp, formatMs, now } from '@/lib/utils'
import type {
  FeedbackState,
  KanaItem,
  KanaSet,
  RecognitionLogEntry,
  ScriptMode,
  StoredSessionReview,
} from '@/types/training'

const DEFAULT_SESSION_SIZE = 50
const LOG_PAGE_SIZE = 50

function buildInitialFeedback(): FeedbackState {
  return { tone: 'info', message: '开始新一组，进入瞬时反应状态。' }
}

function buildPool(activeSets: KanaSet[], scriptMode: ScriptMode) {
  return getActiveKanaPool(KANA, activeSets, scriptMode)
}

function createSessionState(pool: KanaItem[], requestedSize = DEFAULT_SESSION_SIZE) {
  const sessionSize = clamp(
    Number.isFinite(requestedSize) ? Math.round(requestedSize) : DEFAULT_SESSION_SIZE,
    10,
    500,
  )
  const sessionQueue = buildRecSessionQueue(sessionSize, pool)
  const firstIndex = sessionQueue[0]
  const current = typeof firstIndex === 'number' ? pool[firstIndex] ?? pool[0] ?? null : pool[0] ?? null

  return {
    sessionSize,
    sessionQueue,
    sessionIndex: sessionQueue.length ? 1 : 0,
    current,
    answer: '',
    feedback: buildInitialFeedback(),
    logs: [] as RecognitionLogEntry[],
    answeredCount: 0,
    correctCount: 0,
    times: [] as number[],
    reactionMs: 0,
    logPage: 1,
    summaryDismissed: false,
  }
}

interface UseRecognitionSessionOptions {
  preferences: RecognitionPreferences
  onPreferencesChange: (next: RecognitionPreferences | ((current: RecognitionPreferences) => RecognitionPreferences)) => void
}

export function useRecognitionSession({ preferences, onPreferencesChange }: UseRecognitionSessionOptions) {
  const [activeSets, setActiveSets] = useState<KanaSet[]>(preferences.activeSets)
  const [scriptMode, setScriptModeState] = useState<ScriptMode>(preferences.scriptMode)
  const pool = useMemo(() => buildPool(activeSets, scriptMode), [activeSets, scriptMode])
  const [state, setState] = useState(() => createSessionState(pool, preferences.sessionSize))
  const startTimeRef = useRef<number | null>(null)
  const advanceTimerRef = useRef<number | null>(null)
  const sessionIdRef = useRef(1)
  const persistedSessionIdRef = useRef<number | null>(null)
  const currentQuestion = state.current
  const currentAnswer = state.answer

  const aggregateStats = useMemo(
    () => createAggregateStats(state.answeredCount, state.correctCount, state.times),
    [state.answeredCount, state.correctCount, state.times],
  )
  const masteryReached = useMemo(() => hasMetMasteryTarget(aggregateStats), [aggregateStats])
  const summary = useMemo(() => buildRecognitionSummary(state.logs), [state.logs])
  const progress = state.sessionSize > 0 ? Math.min((state.answeredCount / state.sessionSize) * 100, 100) : 0
  const totalPages = Math.max(1, Math.ceil(state.logs.length / LOG_PAGE_SIZE))
  const safeLogPage = Math.min(state.logPage, totalPages)
  const pagedLogs = useMemo(() => {
    const start = (safeLogPage - 1) * LOG_PAGE_SIZE
    return state.logs.slice(start, start + LOG_PAGE_SIZE)
  }, [safeLogPage, state.logs])
  const summaryOpen = state.logs.length > 0 && state.answeredCount >= state.sessionSize && !state.summaryDismissed
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
      id: 'recognition-current',
      ...summary,
      completedAt: state.logs[0]?.timestamp ?? preferences.lastSessionSummary?.completedAt ?? 0,
      sessionSize: state.sessionSize,
      logs: state.logs.slice(0, 500),
      breakdown: buildSessionBreakdown(state.logs),
    }),
    [preferences.lastSessionSummary?.completedAt, state.logs, state.sessionSize, summary],
  )

  useEffect(() => {
    onPreferencesChange((current) => ({
      ...current,
      activeSets,
      scriptMode,
      sessionSize: state.sessionSize,
    }))
  }, [activeSets, onPreferencesChange, scriptMode, state.sessionSize])

  useEffect(() => {
    if (state.answeredCount < state.sessionSize || persistedSessionIdRef.current === sessionIdRef.current) {
      return
    }

    persistedSessionIdRef.current = sessionIdRef.current
    const completedAt = Date.now()
    const completedReview: StoredSessionReview = {
      id: `recognition-${completedAt}-${sessionIdRef.current}`,
      ...summary,
      completedAt,
      sessionSize: state.sessionSize,
      logs: state.logs.slice(0, 500),
      breakdown: buildSessionBreakdown(state.logs),
    }

    onPreferencesChange((current) => ({
      ...current,
      lifetimeStats: mergeLifetimeStats(current.lifetimeStats, {
        total: aggregateStats.total,
        correct: aggregateStats.correct,
        times: state.times,
      }),
      lastSessionSummary: completedReview,
      sessionReviews: appendSessionReview(current.sessionReviews, completedReview),
    }))
  }, [aggregateStats, onPreferencesChange, state.answeredCount, state.logs, state.sessionSize, state.times, summary])

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current)
      }
    }
  }, [])

  const replaceSession = useCallback(
    (nextPool: KanaItem[], requestedSize = state.sessionSize) => {
      sessionIdRef.current += 1
      persistedSessionIdRef.current = null
      const nextState = createSessionState(nextPool, requestedSize)
      setState(nextState)
      startTimeRef.current = now()
    },
    [state.sessionSize],
  )

  const scheduleAdvance = useCallback(
    (delay = 360) => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current)
      }

      advanceTimerRef.current = window.setTimeout(() => {
        setState((currentState) => {
          const nextIndex = currentState.sessionQueue[currentState.sessionIndex]
          const fallback = pool[Math.floor(Math.random() * pool.length)] ?? currentState.current
          const next = typeof nextIndex === 'number' ? pool[nextIndex] ?? fallback : fallback

          return {
            ...currentState,
            current: next,
            sessionIndex: currentState.sessionIndex + 1,
            answer: '',
            reactionMs: 0,
            feedback: { tone: 'idle', message: '' },
          }
        })
        startTimeRef.current = now()
      }, delay)
    },
    [pool],
  )

  const registerAnswer = useCallback((ok: boolean, input: string, measuredMs: number | null) => {
    setState((currentState) => {
      const nextLogs = currentState.current
        ? [
            {
              kana: currentState.current.kana,
              romaji: currentState.current.romaji,
              input,
              ok,
              reactionMs: measuredMs,
              timestamp: Date.now(),
            },
            ...currentState.logs,
          ]
        : currentState.logs

      return {
        ...currentState,
        answeredCount: currentState.answeredCount + 1,
        correctCount: currentState.correctCount + (ok ? 1 : 0),
        times:
          typeof measuredMs === 'number'
            ? [...currentState.times, measuredMs].slice(-200)
            : currentState.times,
        reactionMs: typeof measuredMs === 'number' ? measuredMs : 0,
        logs: nextLogs,
      }
    })
  }, [])

  const submitAnswer = useCallback(() => {
    if (!currentQuestion) {
      return
    }

    const currentKana = currentQuestion.kana
    const currentRomaji = currentQuestion.romaji
    const normalized = normalizeRomaji(currentAnswer)
    if (!normalized) {
      return
    }

    const measuredMs = startTimeRef.current ? now() - startTimeRef.current : 0
    const ok = normalized === currentRomaji
    registerAnswer(ok, normalized, measuredMs)
    setState((currentState) => ({
      ...currentState,
      feedback: {
        tone: ok ? 'success' : 'error',
        message: ok
          ? `正确：${currentKana} → ${currentRomaji}`
          : `错误：你写的是 “${normalized}”，正确是 “${currentRomaji}”`,
      },
    }))
    playResultSound(ok)
    scheduleAdvance()
  }, [currentAnswer, currentQuestion, registerAnswer, scheduleAdvance])

  const skipQuestion = useCallback(() => {
    registerAnswer(false, '(skip)', null)
    setState((currentState) => ({
      ...currentState,
      feedback: {
        tone: 'error',
        message: currentState.current ? `已跳过：${currentState.current.kana} → ${currentState.current.romaji}` : '已跳过本题',
      },
    }))
    playResultSound(false)
    scheduleAdvance(120)
  }, [registerAnswer, scheduleAdvance])

  const toggleKanaSet = useCallback(
    (target: KanaSet) => {
      setActiveSets((currentSets) => {
        const nextSets = toggleKanaSetSelection(currentSets, target)
        replaceSession(buildPool(nextSets, scriptMode), state.sessionSize)
        return nextSets
      })
    },
    [replaceSession, scriptMode, state.sessionSize],
  )

  const setScriptMode = useCallback(
    (mode: ScriptMode) => {
      setScriptModeState(mode)
      replaceSession(buildPool(activeSets, mode), state.sessionSize)
    },
    [activeSets, replaceSession, state.sessionSize],
  )

  const setSessionSize = useCallback((value: number) => {
    setState((currentState) => ({
      ...currentState,
      sessionSize: clamp(Number.isFinite(value) ? Math.round(value) : DEFAULT_SESSION_SIZE, 10, 500),
    }))
  }, [])

  const setAnswer = useCallback((value: string) => {
    setState((currentState) => ({ ...currentState, answer: value }))
  }, [])

  const setLogPage = useCallback(
    (value: number) => {
      setState((currentState) => ({ ...currentState, logPage: Math.max(1, Math.min(value, totalPages)) }))
    },
    [totalPages],
  )

  const setSummaryOpen = useCallback((open: boolean) => {
    setState((currentState) => ({ ...currentState, summaryDismissed: !open }))
  }, [])

  const startNewSession = useCallback(
    (requestedSize = state.sessionSize) => {
      replaceSession(pool, requestedSize)
    },
    [pool, replaceSession, state.sessionSize],
  )

  const statsLabel = useMemo(() => {
    let text = `本组已答：${aggregateStats.total} · 正确：${aggregateStats.correct} · 准确率：${aggregateStats.accuracy.toFixed(1)}% · 平均反应：${formatMs(aggregateStats.averageMs)} ms`
    if (masteryReached) {
      text += ' · ✅ 已达目标线'
    }
    return text
  }, [aggregateStats, masteryReached])

  return {
    activeSets,
    answer: state.answer,
    current: state.current,
    currentReview,
    feedback: state.feedback,
    lastSessionSummary: preferences.lastSessionSummary,
    lifetimeStats,
    logPage: safeLogPage,
    pagedLogs,
    pool,
    progress,
    reactionMs: state.reactionMs,
    scriptMode,
    sessionIndex: state.sessionIndex,
    sessionReviews: preferences.sessionReviews,
    sessionSize: state.sessionSize,
    stats: aggregateStats,
    statsLabel,
    summary,
    summaryOpen,
    totalPages,
    masteryReached,
    setAnswer,
    setLogPage,
    setScriptMode,
    setSessionSize,
    setSummaryOpen,
    startNewSession,
    submitAnswer,
    skipQuestion,
    toggleKanaSet,
  }
}
