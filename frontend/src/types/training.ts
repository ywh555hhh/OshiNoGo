export type KanaSet = 'seion' | 'dakuon' | 'handakuon' | 'youon'
export type ScriptMode = 'hiragana' | 'katakana' | 'mixed'
export type ThemePreference = 'light' | 'dark' | 'system'
export type TrainingMode = 'recognition' | 'dictation' | 'words'
export type SpeechCapabilityStatus = 'ready' | 'limited' | 'unsupported'
export type RecognitionAnswerFeedbackMode = 'result-sound' | 'speak-kana'

export interface KanaItem {
  kana: string
  romaji: string
  set: KanaSet
  script: Exclude<ScriptMode, 'mixed'>
}

export interface WordItem {
  word: string
  romaji: string
  meaning: string
}

export interface AggregateStats {
  total: number
  correct: number
  accuracy: number
  averageMs: number
}

export interface RecognitionLogEntry {
  kana: string
  romaji: string
  input: string
  ok: boolean
  reactionMs: number | null
  timestamp: number
}

export interface KanaPerformance {
  kana: string
  romaji: string
  total: number
  correct: number
  accuracy: number
  averageMs: number
}

export interface SessionKanaReview extends KanaPerformance {
  wrong: number
  bestMs: number | null
  worstMs: number | null
}

export interface RecognitionSummary {
  total: number
  correct: number
  wrong: number
  accuracy: number
  averageMs: number
  bestMs: number | null
  worstMs: number | null
  weakest: SessionKanaReview[]
  slowest: SessionKanaReview[]
}

export interface StoredSessionSummary extends RecognitionSummary {
  completedAt: number
  sessionSize: number
}

export interface StoredSessionReview extends StoredSessionSummary {
  id: string
  logs: RecognitionLogEntry[]
  breakdown: SessionKanaReview[]
}

export interface LifetimeStats {
  total: number
  correct: number
  times: number[]
  sessions: number
}

export interface SpeechCapability {
  status: SpeechCapabilityStatus
  hasSynthesis: boolean
  voicesLoaded: boolean
  hasJapaneseVoice: boolean
  voiceCount: number
  label: string
  hint: string
}

export interface SpeechPlaybackResult {
  ok: boolean
  message: string
}

export interface FeedbackState {
  tone: 'idle' | 'success' | 'error' | 'info'
  message: string
}
