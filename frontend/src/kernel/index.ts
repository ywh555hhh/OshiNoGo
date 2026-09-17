export type { Item, Modality, ResponseChannel, GradeReason, TrialEvent } from './types'

export {
  METRIC_SUPPORT,
  RESPONSE_CHANNELS,
  channelsPresent,
  isMachineGradedChannel,
  isSelfReported,
  type MetricSupport,
} from './channels'

export {
  normalize,
  buildAnswerIndex,
  grade,
  type AnswerIndex,
  type AnswerKeySource,
  type GradeRequest,
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
  type ChannelTally,
  type TrialMetrics,
  type SummarizeOptions,
} from './metrics'

export { nextRandom, shuffle, pickWeighted, type RngStep } from './random'

export {
  DEFAULT_SCHEDULE,
  findRequeuable,
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
