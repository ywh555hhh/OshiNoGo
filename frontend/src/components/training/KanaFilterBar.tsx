import { KANA_SET_LABELS } from '@/data/kana'
import { Button } from '@/components/ui/button'
import type { KanaSet } from '@/types/training'

interface KanaFilterBarProps {
  activeSets: KanaSet[]
  onToggle: (set: KanaSet) => void
}

const ORDER: KanaSet[] = ['seion', 'dakuon', 'handakuon', 'youon']

export function KanaFilterBar({ activeSets, onToggle }: KanaFilterBarProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">题库</div>
      <div className="flex flex-wrap gap-2">
        {ORDER.map((set) => {
          const active = activeSets.includes(set)
          return (
            <Button
              key={set}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggle(set)}
              className="rounded-full"
            >
              {KANA_SET_LABELS[set]}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
