import { useMemo } from 'react'

import { usePersistentState } from '@/hooks/usePersistentState'
import type {
  KanaSet,
  LifetimeStats,
  ScriptMode,
  StoredSessionSummary,
  ThemePreference,
  TrainingMode,
} from '@/types/training'

const APP_PREFERENCES_VERSION = 1
const APP_PREFERENCES_KEY = 'oshinogo.app-preferences'

export interface RecognitionPreferences {
  activeSets: KanaSet[]
  scriptMode: ScriptMode
  sessionSize: number
  lifetimeStats: LifetimeStats
  lastSessionSummary: StoredSessionSummary | null
}

export interface DictationPreferences {
  activeSets: KanaSet[]
  scriptMode: ScriptMode
  sessionSize: number
  lifetimeStats: LifetimeStats
  lastSessionSummary: StoredSessionSummary | null
}

export interface WordsPreferences {
  practicedCount: number
}

export interface AppPreferences {
  theme: ThemePreference
  lastMode: TrainingMode
  onboardingCompleted: boolean
  recognition: RecognitionPreferences
  dictation: DictationPreferences
  words: WordsPreferences
}

export const DEFAULT_LIFETIME_STATS: LifetimeStats = {
  total: 0,
  correct: 0,
  times: [],
  sessions: 0,
}

const DEFAULT_RECOGNITION_PREFERENCES: RecognitionPreferences = {
  activeSets: ['seion'],
  scriptMode: 'hiragana',
  sessionSize: 50,
  lifetimeStats: DEFAULT_LIFETIME_STATS,
  lastSessionSummary: null,
}

const DEFAULT_DICTATION_PREFERENCES: DictationPreferences = {
  activeSets: ['seion'],
  scriptMode: 'hiragana',
  sessionSize: 30,
  lifetimeStats: DEFAULT_LIFETIME_STATS,
  lastSessionSummary: null,
}

const DEFAULT_WORDS_PREFERENCES: WordsPreferences = {
  practicedCount: 0,
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  theme: 'system',
  lastMode: 'recognition',
  onboardingCompleted: false,
  recognition: DEFAULT_RECOGNITION_PREFERENCES,
  dictation: DEFAULT_DICTATION_PREFERENCES,
  words: DEFAULT_WORDS_PREFERENCES,
}

function normalizeSets(value: unknown, fallback: KanaSet[]) {
  if (!Array.isArray(value)) {
    return fallback
  }

  const valid = value.filter(
    (item): item is KanaSet =>
      item === 'seion' || item === 'dakuon' || item === 'handakuon' || item === 'youon',
  )

  return valid.length ? valid : fallback
}

function normalizeScriptMode(value: unknown, fallback: ScriptMode) {
  if (value === 'hiragana' || value === 'katakana' || value === 'mixed') {
    return value
  }
  return fallback
}

function normalizeTheme(value: unknown) {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value
  }
  return DEFAULT_APP_PREFERENCES.theme
}

function normalizeMode(value: unknown) {
  if (value === 'recognition' || value === 'dictation' || value === 'words') {
    return value
  }
  return DEFAULT_APP_PREFERENCES.lastMode
}

function normalizeNumber(value: unknown, fallback: number, min = 0, max = 500) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(Math.max(Math.round(value), min), max)
}

function normalizeTimes(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item)).slice(-200)
}

function normalizeLifetimeStats(value: unknown): LifetimeStats {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_LIFETIME_STATS }
  }

  const candidate = value as Partial<LifetimeStats>
  return {
    total: normalizeNumber(candidate.total, 0, 0, 100000),
    correct: normalizeNumber(candidate.correct, 0, 0, 100000),
    times: normalizeTimes(candidate.times),
    sessions: normalizeNumber(candidate.sessions, 0, 0, 100000),
  }
}

function normalizeSessionSummary(value: unknown): StoredSessionSummary | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<StoredSessionSummary>
  if (typeof candidate.total !== 'number' || typeof candidate.correct !== 'number') {
    return null
  }

  return {
    total: normalizeNumber(candidate.total, 0, 0, 100000),
    correct: normalizeNumber(candidate.correct, 0, 0, 100000),
    wrong: normalizeNumber(candidate.wrong, 0, 0, 100000),
    accuracy: typeof candidate.accuracy === 'number' && Number.isFinite(candidate.accuracy) ? candidate.accuracy : 0,
    averageMs: typeof candidate.averageMs === 'number' && Number.isFinite(candidate.averageMs) ? candidate.averageMs : 0,
    bestMs:
      typeof candidate.bestMs === 'number' && Number.isFinite(candidate.bestMs) ? candidate.bestMs : null,
    worstMs:
      typeof candidate.worstMs === 'number' && Number.isFinite(candidate.worstMs) ? candidate.worstMs : null,
    weakest: Array.isArray(candidate.weakest) ? candidate.weakest : [],
    slowest: Array.isArray(candidate.slowest) ? candidate.slowest : [],
    completedAt:
      typeof candidate.completedAt === 'number' && Number.isFinite(candidate.completedAt)
        ? candidate.completedAt
        : Date.now(),
    sessionSize: normalizeNumber(candidate.sessionSize, 0, 0, 500),
  }
}

function normalizeRecognitionPreferences(value: unknown): RecognitionPreferences {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_RECOGNITION_PREFERENCES, lifetimeStats: { ...DEFAULT_LIFETIME_STATS } }
  }

  const candidate = value as Partial<RecognitionPreferences>
  return {
    activeSets: normalizeSets(candidate.activeSets, DEFAULT_RECOGNITION_PREFERENCES.activeSets),
    scriptMode: normalizeScriptMode(candidate.scriptMode, DEFAULT_RECOGNITION_PREFERENCES.scriptMode),
    sessionSize: normalizeNumber(candidate.sessionSize, DEFAULT_RECOGNITION_PREFERENCES.sessionSize, 10, 500),
    lifetimeStats: normalizeLifetimeStats(candidate.lifetimeStats),
    lastSessionSummary: normalizeSessionSummary(candidate.lastSessionSummary),
  }
}

function normalizeDictationPreferences(value: unknown): DictationPreferences {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_DICTATION_PREFERENCES, lifetimeStats: { ...DEFAULT_LIFETIME_STATS } }
  }

  const candidate = value as Partial<DictationPreferences>
  return {
    activeSets: normalizeSets(candidate.activeSets, DEFAULT_DICTATION_PREFERENCES.activeSets),
    scriptMode: normalizeScriptMode(candidate.scriptMode, DEFAULT_DICTATION_PREFERENCES.scriptMode),
    sessionSize: normalizeNumber(candidate.sessionSize, DEFAULT_DICTATION_PREFERENCES.sessionSize, 10, 500),
    lifetimeStats: normalizeLifetimeStats(candidate.lifetimeStats),
    lastSessionSummary: normalizeSessionSummary(candidate.lastSessionSummary),
  }
}

function normalizeWordsPreferences(value: unknown): WordsPreferences {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_WORDS_PREFERENCES }
  }

  const candidate = value as Partial<WordsPreferences>
  return {
    practicedCount: normalizeNumber(candidate.practicedCount, 0, 0, 100000),
  }
}

function normalizePreferences(value: unknown): AppPreferences {
  if (!value || typeof value !== 'object') {
    return {
      ...DEFAULT_APP_PREFERENCES,
      recognition: { ...DEFAULT_RECOGNITION_PREFERENCES, lifetimeStats: { ...DEFAULT_LIFETIME_STATS } },
      dictation: { ...DEFAULT_DICTATION_PREFERENCES, lifetimeStats: { ...DEFAULT_LIFETIME_STATS } },
      words: { ...DEFAULT_WORDS_PREFERENCES },
    }
  }

  const candidate = value as Partial<AppPreferences>
  return {
    theme: normalizeTheme(candidate.theme),
    lastMode: normalizeMode(candidate.lastMode),
    onboardingCompleted: Boolean(candidate.onboardingCompleted),
    recognition: normalizeRecognitionPreferences(candidate.recognition),
    dictation: normalizeDictationPreferences(candidate.dictation),
    words: normalizeWordsPreferences(candidate.words),
  }
}

type PreferenceUpdater<T> = T | ((current: T) => T)

function resolveUpdater<T>(current: T, next: PreferenceUpdater<T>) {
  return typeof next === 'function' ? (next as (value: T) => T)(current) : next
}

export function mergeLifetimeStats(current: LifetimeStats, payload: { total: number; correct: number; times: number[] }) {
  return {
    total: current.total + payload.total,
    correct: current.correct + payload.correct,
    times: [...current.times, ...payload.times].slice(-200),
    sessions: current.sessions + 1,
  }
}

export function useAppPreferences() {
  const { state, setState, reset, isPersistenceDegraded, persistenceWarning } = usePersistentState<AppPreferences>({
    key: APP_PREFERENCES_KEY,
    version: APP_PREFERENCES_VERSION,
    fallback: DEFAULT_APP_PREFERENCES,
    migrate: normalizePreferences,
  })

  const actions = useMemo(
    () => ({
      setTheme: (theme: ThemePreference) => setState((current) => ({ ...current, theme })),
      setLastMode: (lastMode: TrainingMode) => setState((current) => ({ ...current, lastMode })),
      completeOnboarding: () => setState((current) => ({ ...current, onboardingCompleted: true })),
      reopenOnboarding: () => setState((current) => ({ ...current, onboardingCompleted: false })),
      updateRecognition: (recognition: PreferenceUpdater<RecognitionPreferences>) =>
        setState((current) => ({ ...current, recognition: resolveUpdater(current.recognition, recognition) })),
      updateDictation: (dictation: PreferenceUpdater<DictationPreferences>) =>
        setState((current) => ({ ...current, dictation: resolveUpdater(current.dictation, dictation) })),
      updateWords: (words: PreferenceUpdater<WordsPreferences>) =>
        setState((current) => ({ ...current, words: resolveUpdater(current.words, words) })),
      reset,
    }),
    [reset, setState],
  )

  return useMemo(
    () => ({ preferences: state, isPersistenceDegraded, persistenceWarning, ...actions }),
    [actions, isPersistenceDegraded, persistenceWarning, state],
  )
}
