import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import {
  createAnswerIndex,
  createSession,
  deriveSummary,
  step,
  type ResponseChannel,
  type SessionConfig,
  type SessionEvent,
  type SessionState,
  type SessionSummary,
  type TrialEvent,
} from '@/kernel'

/**
 * 冲刺到点后再给一点宽限，让「飞行中的那一题」有机会被答完。
 *
 * kernel 的规则是「冲刺在飞行中那一题答完之后才结束」。如果 UI 一到点就
 * 硬停，就会把用户正在做的那题切掉；给宽限之后，用户答完 → kernel 自然收尾，
 * 没答 → UI 才 stop。两条路径都不会丢已经在做的题。
 */
const SPRINT_GRACE_MS = 2000
const CLOCK_TICK_MS = 100

export interface DrillSession {
  channel: ResponseChannel
  phase: SessionState['phase']
  current: SessionState['current']
  options: SessionState['options']
  answeredCount: number
  lastEvent: TrialEvent | null
  summary: SessionSummary
  remainingMs: number | null
  elapsedMs: number
  /** tap 通道 */
  answer: (choiceId: string) => void
  /** type 通道 */
  submitText: (text: string) => void
  /** speak 通道 */
  selfReport: (ok: boolean) => void
  skip: () => void
  stop: () => void
}

/**
 * kernel 的 React 绑定。这里只做 kernel 不能做的事：
 * DOM 时钟、requestAnimationFrame、把事件转发给纯 reducer。
 * 所有状态与规则都在 kernel 里，所以「切 Tab 丢进度」这类问题不存在——
 * 状态是数据，不是组件树。
 */
export function useDrillSession(
  config: SessionConfig,
  onFinish: (state: SessionState) => void,
): DrillSession {
  const channel = config.spec.channel
  const index = useMemo(() => createAnswerIndex(config), [config])
  const reducer = useCallback(
    (state: SessionState, event: SessionEvent) => step(state, event, config, index),
    [config, index],
  )

  const [state, dispatch] = useReducer(reducer, config, createSession)
  const [clock, setClock] = useState(() => performance.now())
  const finishHandled = useRef(false)

  // 先解构：让下面每个 effect 的依赖都是普通局部变量，
  // 而不是 state.xxx 这种每次都被 lint 追问的写法。
  const { phase, current, currentOnset, startedAt, options } = state

  useEffect(() => {
    dispatch({ type: 'start', at: performance.now() })
  }, [])

  // 双 rAF：等这一帧的刺激真正上屏之后才起表。
  // 单帧不够 —— React 提交之后浏览器可能还没绘制，那时起表会把绘制延迟
  // 算进「反应时间」里，几十毫秒的噪声足以让所有指标失真。
  useEffect(() => {
    if (phase !== 'awaiting' || !current || currentOnset !== null) {
      return
    }

    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        dispatch({ type: 'present', at: performance.now() })
      })
    })

    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [phase, current, currentOnset])

  useEffect(() => {
    if (config.durationMs === null || phase === 'finished') {
      return
    }

    const id = window.setInterval(() => setClock(performance.now()), CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [config.durationMs, phase])

  useEffect(() => {
    if (config.durationMs === null || startedAt === null || phase === 'finished') {
      return
    }

    const left = config.durationMs + SPRINT_GRACE_MS - (performance.now() - startedAt)
    const id = window.setTimeout(
      () => dispatch({ type: 'stop', at: performance.now() }),
      Math.max(0, left),
    )

    return () => window.clearTimeout(id)
  }, [config.durationMs, startedAt, phase])

  useEffect(() => {
    if (phase !== 'finished' || finishHandled.current) {
      return
    }

    finishHandled.current = true
    onFinish(state)
  }, [phase, onFinish, state])

  const summary = useMemo(() => deriveSummary(state, clock, config), [state, clock, config])

  const elapsedMs =
    startedAt === null ? 0 : Math.max(0, (state.endedAt ?? clock) - startedAt)

  const remainingMs =
    config.durationMs === null ? null : Math.max(0, config.durationMs - elapsedMs)

  const answer = useCallback((choiceId: string) => {
    dispatch({ type: 'choose', at: performance.now(), choiceId })
  }, [])

  const submitText = useCallback((text: string) => {
    dispatch({ type: 'submitText', at: performance.now(), text })
  }, [])

  const selfReport = useCallback((ok: boolean) => {
    dispatch({ type: 'selfReport', at: performance.now(), ok })
  }, [])

  const skip = useCallback(() => {
    dispatch({ type: 'skip', at: performance.now() })
  }, [])

  const stop = useCallback(() => {
    dispatch({ type: 'stop', at: performance.now() })
  }, [])

  // 键盘只是桌面端的加速器，不是必经路径（R0：手机是第一上帝）。
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key === 'Escape') {
        stop()
        return
      }

      // 数字键与空格只属于 tap 通道。
      // 在 type 通道里吞掉空格会把 romaji 输入打成两截。
      if (channel !== 'tap') {
        return
      }

      if (event.key === ' ') {
        event.preventDefault()
        skip()
        return
      }

      const position = Number(event.key) - 1
      const choice = options[position]
      if (choice) {
        event.preventDefault()
        answer(choice.id)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answer, channel, options, skip, stop])

  return {
    channel,
    phase,
    current,
    options,
    answeredCount: state.events.length,
    lastEvent: state.events.length ? state.events[state.events.length - 1] : null,
    summary,
    remainingMs,
    elapsedMs,
    answer,
    submitText,
    selfReport,
    skip,
    stop,
  }
}
