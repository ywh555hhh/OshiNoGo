/**
 * kernel 的词汇表。
 *
 * 这一层刻意不知道「假名」「五十音」「日语」是什么。
 *
 * 关键设计：`Item` 是**不透明**的——只有 id、刺激、标签。
 * 「看到什么算对」「什么和什么听起来一样」全都由 DrillSpec 的
 * `percept` / `expectOf` / `labelOf` 三个函数提供。
 *
 * 这不是洁癖，是被真实的 bug 逼出来的：识别 drill 的期望答案是 romaji，
 * 听写 drill 的期望答案是假名。同一个 item 不可能同时服务两种模式，
 * 所以答案语义不可能长在 item 上。
 */

export interface Item {
  id: string
  /** 学习者看到或听到的刺激；音频模式下是预渲染音频剪辑的 key。 */
  prompt: string
  tags?: readonly string[]
}

export type Modality = 'visual' | 'audio'

/**
 * 刺激 onset 的来源。**决定 Rt 能不能算**——这是 0.5 秒那个靶子唯一的地基。
 *
 * 注意：onset 是「刺激侧」的性质，作答通道是「响应侧」的性质。
 * 两者独立，缺一个速度指标就不成立（见 channels.ts 的 metricSupportFor）。
 */
export type OnsetSource =
  /** 双 rAF 之后起表：我们确定它已经上屏。 */
  | 'paint'
  /** 预渲染音频 + Web Audio 排程播放：我们确定它何时响。 */
  | 'audio-scheduled'
  /**
   * speechSynthesis：onset 不可知（各平台实现不同、无可靠事件）。
   *
   * 这样的 drill 只能是**不计时的练习**：既没有 Rt，也没有可比的吞吐，
   * 因为每条的 TTS 启动与音节时长都不一样，「个/分」会被音频长度污染。
   */
  | 'audio-unknown'

/**
 * 作答通道。
 *
 * 这三者训练的是**不同的知识方向**，不可互相替代：
 * 接受性（认得出）与产出性（写得出 / 说得出）之间的迁移「远非线性」
 * （receptive–productive gap），这是二语习得里相当稳定的结论。
 *
 * 但它们在**可测性**上并不平等，见 channels.ts。
 */
export type ResponseChannel =
  /** 点按 N 选 1。延迟只有触摸采样量级，速度指标可信。 */
  | 'tap'
  /** 文本输入（打 romaji / 打假名）。机器可判分，但单题 RT 被 IME 机制主导。 */
  | 'type'
  /** 出声读，自己判对错。无可靠自动判分手段，只能自评。 */
  | 'speak'

/** 判分结果的原因。除 empty 外，出现即代表一次有效 trial。 */
export type GradeReason =
  | 'correct'
  | 'equivalent'
  | 'wrong'
  | 'empty'
  | 'skipped'
  | 'timeout'
  /** 自评通道专用：学习者自己判为完成。 */
  | 'self-pass'
  /** 自评通道专用：学习者自己判为没做出来。 */
  | 'self-fail'

/** 一次作答。这是系统的唯一真相。 */
export interface TrialEvent {
  itemId: string
  /** 刺激 onset（视觉为双 rAF 之后；音频为排程 onset），与 tResponse 同一时钟。 */
  tOnset: number
  /** 作答时刻；null 表示未给出作答（跳过 / 超时）。 */
  tResponse: number | null
  response: string | null
  ok: boolean
  reason: GradeReason
  /**
   * 这一次作答走的是哪个通道。
   *
   * 必须逐条记录而不是只在 session 上记一次：档案里混了不同通道的组时，
   * 只有逐条带上通道，指标层才有机会拒绝把不可比的东西混在一起算。
   */
  channel: ResponseChannel
}
