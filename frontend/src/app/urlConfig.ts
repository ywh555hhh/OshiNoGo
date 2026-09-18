import { KANA_SETS, type KanaSet } from '@/drills/kana/kana'
import type { ScriptMode } from '@/drills/kana/specs'

/**
 * URL 即配置。
 *
 * 零设置界面：一个 drill = 一个可分享、可收藏的链接。
 * 这对「免费资源站」是双重收益——既省掉一整块配置 UI，又天然可传播。
 */

/**
 * 四个 drill。
 *
 * 注意这里选的是 **drill**，不是「作答通道」：一个 drill = 刺激 + 通道 的组合。
 * 听音选字的作答通道也是点按，但它练的是另一个方向的知识，指标有效性也不同。
 */
export const DRILLS = ['tap', 'type', 'speak', 'listen'] as const
export type DrillId = (typeof DRILLS)[number]

export const DRILL_LABELS: Record<DrillId, string> = {
  tap: '看形选音',
  type: '看形打 romaji',
  speak: '看形读出来',
  listen: '听音选形',
}

export interface DrillUrl {
  /** 配置对象不该被就地修改，所以是 readonly。 */
  sets: readonly KanaSet[]
  script: ScriptMode
  /** 选哪个 drill（刺激 + 作答通道的组合）。 */
  drill: DrillId
  /** 选项总数（含正确项）。只对带选项的 drill 有意义。 */
  choiceSize: number
  /** 冲刺秒数；0 = 无时限。 */
  sprintSeconds: number
}

export const DEFAULT_DRILL_URL: DrillUrl = {
  sets: ['seion'],
  script: 'hiragana',
  drill: 'tap',
  choiceSize: 4,
  sprintSeconds: 60,
}

export const CHOICE_SIZE_RANGE = { min: 2, max: 8 } as const
export const SPRINT_RANGE = { min: 0, max: 600 } as const

const SCRIPT_MODES: readonly ScriptMode[] = ['hiragana', 'katakana', 'both']

/** 这个 drill 是否使用选项集。 */
export function hasChoices(drill: DrillId): boolean {
  return drill === 'tap' || drill === 'listen'
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  // URLSearchParams 对 `?n=` 这种空值返回 ''，不是 null。
  // 不排掉的话 Number('') === 0 且是整数，会把一个畸形链接静默变成 0（= 无时限）。
  if (raw === null || raw.trim() === '') {
    return fallback
  }

  const parsed = Number(raw)
  if (!Number.isInteger(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}

function parseSets(raw: string | null): readonly KanaSet[] {
  if (!raw) {
    return DEFAULT_DRILL_URL.sets
  }

  const known = new Set<string>(KANA_SETS)
  const parsed = raw
    .split(',')
    .map((piece) => piece.trim().toLowerCase())
    .filter((piece): piece is KanaSet => known.has(piece))

  // 去重，保持声明顺序（而不是用户输入的顺序），让 URL 规范化后稳定
  const unique = KANA_SETS.filter((set) => parsed.includes(set))

  return unique.length ? unique : DEFAULT_DRILL_URL.sets
}

function parseScript(raw: string | null): ScriptMode {
  const value = raw?.trim().toLowerCase()
  return SCRIPT_MODES.find((mode) => mode === value) ?? DEFAULT_DRILL_URL.script
}

/**
 * `ch` 是历史参数名（当时只有「作答通道」这一个维度），继续接受，
 * 以免之前分享出去的链接失效。
 */
function parseDrill(params: URLSearchParams): DrillId {
  const raw = (params.get('drill') ?? params.get('ch'))?.trim().toLowerCase()
  return DRILLS.find((drill) => drill === raw) ?? DEFAULT_DRILL_URL.drill
}

/**
 * 解析查询串。坏值一律回退到默认值，绝不抛异常 ——
 * 一个分享出去的链接被手改坏了，应该还能用，而不是白屏。
 */
export function parseDrillUrl(search: string): DrillUrl {
  const params = new URLSearchParams(search)

  return {
    sets: parseSets(params.get('set')),
    script: parseScript(params.get('script')),
    drill: parseDrill(params),
    choiceSize: clampInt(
      params.get('n'),
      DEFAULT_DRILL_URL.choiceSize,
      CHOICE_SIZE_RANGE.min,
      CHOICE_SIZE_RANGE.max,
    ),
    sprintSeconds: clampInt(
      params.get('sprint'),
      DEFAULT_DRILL_URL.sprintSeconds,
      SPRINT_RANGE.min,
      SPRINT_RANGE.max,
    ),
  }
}

/** 只输出与默认值不同的项，链接尽量短（微信里分享的可读性）。 */
export function toSearch(config: DrillUrl): string {
  const params = new URLSearchParams()

  const sets = KANA_SETS.filter((set) => config.sets.includes(set))
  if (sets.join(',') !== DEFAULT_DRILL_URL.sets.join(',')) {
    params.set('set', sets.join(','))
  }
  if (config.script !== DEFAULT_DRILL_URL.script) {
    params.set('script', config.script)
  }
  if (config.drill !== DEFAULT_DRILL_URL.drill) {
    params.set('drill', config.drill)
  }
  if (config.choiceSize !== DEFAULT_DRILL_URL.choiceSize && hasChoices(config.drill)) {
    params.set('n', String(config.choiceSize))
  }
  if (config.sprintSeconds !== DEFAULT_DRILL_URL.sprintSeconds) {
    params.set('sprint', String(config.sprintSeconds))
  }

  const search = params.toString()
  return search ? `?${search}` : ''
}
