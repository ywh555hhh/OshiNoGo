import { Button } from '@/components/ui/button'
import type { ScriptMode } from '@/types/training'

interface ScriptModeSwitchProps {
  value: ScriptMode
  onChange: (mode: ScriptMode) => void
}

const MODES: Array<{ value: ScriptMode; label: string }> = [
  { value: 'hiragana', label: '平假名' },
  { value: 'katakana', label: '片假名' },
  { value: 'mixed', label: '混合' },
]

export function ScriptModeSwitch({ value, onChange }: ScriptModeSwitchProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">文字种类</div>
      <div className="flex flex-wrap gap-2">
        {MODES.map((mode) => (
          <Button
            key={mode.value}
            type="button"
            variant={value === mode.value ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={() => onChange(mode.value)}
          >
            {mode.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
