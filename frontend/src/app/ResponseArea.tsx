import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import type { Choice, ResponseChannel } from '@/kernel'

import { cn } from './cn'
import { speakReference } from './speakReference'

/** Tailwind 看不到动态类名，映射必须是静态字面量，否则会被 purge 掉。 */
const COLUMN_CLASS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

function columnsFor(count: number): string {
  if (count <= 4) {
    return COLUMN_CLASS[2]
  }

  return count <= 6 ? COLUMN_CLASS[3] : COLUMN_CLASS[4]
}

export interface ResponseAreaProps {
  channel: ResponseChannel
  options: Choice[]
  /** 本题的正确读音（speak 通道要揭示它）。 */
  expected: string | null
  /** 本题的刺激（speak 通道要朗读它）。 */
  prompt: string | null
  draft: string
  onDraftChange: (value: string) => void
  onTap: (choiceId: string) => void
  onType: (text: string) => void
  onSelfReport: (ok: boolean) => void
  onSkip: () => void
  onStop: () => void
}

export function ResponseArea(props: ResponseAreaProps) {
  const { channel, onSkip, onStop } = props

  return (
    <footer className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {channel === 'tap' ? <TapGrid {...props} /> : null}
      {channel === 'type' ? <TypeInput {...props} /> : null}
      {channel === 'speak' ? <SpeakSelfCheck {...props} /> : null}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button type="button" onPointerDown={onSkip} className="px-2 py-2 underline">
          跳过
        </button>
        <button type="button" onPointerDown={onStop} className="px-2 py-2 underline">
          结束
        </button>
      </div>
    </footer>
  )
}

function TapGrid({ options, onTap }: ResponseAreaProps) {
  return (
    <div className={cn('grid gap-3', columnsFor(options.length))}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          // pointerdown 而不是 click：少一层点击判定，且与 kernel 的起表口径一致
          onPointerDown={() => onTap(option.id)}
          className="h-16 rounded-2xl border border-border bg-card text-2xl font-semibold text-foreground transition active:scale-[0.97] active:bg-muted sm:h-20"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function TypeInput({ draft, onDraftChange, onType }: ResponseAreaProps) {
  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return
    }

    // 输入法正在组词时按 Enter 是「确定候选」，不是提交。
    // 不判这一条，日语输入法下会提交一段还没上屏的假名。
    if (event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    onType(draft)
  }

  return (
    <div className="space-y-2">
      <input
        // 不按题目 key 重挂载：重挂载会丢焦点、在手机上等于每关一次键盘
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入 romaji，回车提交"
        aria-label="romaji"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="go"
        className="h-14 w-full rounded-2xl border border-input bg-card px-4 text-lg"
      />
      <p className="text-xs text-muted-foreground">
        打字通道不测反应时间 —— 测出来的会是输入法而不是假名。这里只看每分钟能做对多少个。
      </p>
    </div>
  )
}

function SpeakSelfCheck({ expected, prompt, onSelfReport }: ResponseAreaProps) {
  const [revealed, setRevealed] = useState(false)
  const [reference, setReference] = useState<'idle' | 'ok' | 'unsupported'>('idle')

  if (!revealed) {
    return (
      <div className="space-y-3">
        <p className="text-center text-sm text-muted-foreground">
          先自己读出来，再对照答案。说不出来就直接揭晓。
        </p>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="h-14 w-full rounded-2xl bg-foreground text-base font-semibold text-background active:scale-[0.99]"
        >
          说完了，揭晓答案
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-card p-4 text-center">
        <div className="text-xs text-muted-foreground">正确读音</div>
        <div className="mt-1 text-3xl font-semibold">{expected ?? '—'}</div>
        <button
          type="button"
          // 必须在手势里调，否则 iOS 不会出声
          onClick={() => setReference(speakReference(prompt ?? ''))}
          className="mt-3 text-xs text-muted-foreground underline"
        >
          {reference === 'unsupported' ? '这台设备没有日语语音，只能自己对答案' : '听一次示范'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onPointerDown={() => onSelfReport(true)}
          className="h-14 rounded-2xl border bg-card text-base font-semibold text-correct active:scale-[0.97]"
        >
          读对了
        </button>
        <button
          type="button"
          onPointerDown={() => onSelfReport(false)}
          className="h-14 rounded-2xl border bg-card text-base font-semibold text-wrong active:scale-[0.97]"
        >
          没读出来
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        这一项是你自己判的，所以它只进准确率，不进任何速度指标。
      </p>
    </div>
  )
}
