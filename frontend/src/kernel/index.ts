export type { Item, Modality, GradeReason, TrialEvent } from './types'

export {
  normalize,
  buildAnswerIndex,
  grade,
  type AnswerIndex,
  type AnswerKeySource,
  type GradeResult,
  type PerceptKey,
} from './grading'

export {
  ANTICIPATION_MS,
  IDLE_MS,
  MIN_TRIALS_FOR_TREND,
  median,
  mean,
  stdev,
  coefficientOfVariation,
  toIcpm,
  summarize,
  celeration,
  type TrialMetrics,
  type SummarizeOptions,
} from './metrics'

export { nextRandom, shuffle, pickWeighted, type RngStep } from './random'

export {
  DEFAULT_SCHEDULE,
  pickNext,
  weightFor,
  type ScheduleConfig,
  type PickRequest,
  type PickResult,
} from './schedule'

export {
  buildChoiceSet,
  type Choice,
  type ChoiceSet,
  type ChoiceSource,
  type BuildChoiceSetRequest,
} from './choices'

export {
  createSession,
  createAnswerIndex,
  step,
  deriveSummary,
  type DrillSpec,
  type SessionConfig,
  type SessionState,
  type SessionEvent,
  type SessionSummary,
} from './session'

export {
  ARCHIVE_VERSION,
  serializeArchive,
  deserializeArchive,
  type Archive,
  type ArchivedSession,
} from './persist'
