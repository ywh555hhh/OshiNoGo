import { BookOpenText, MoonStar, Sparkles, SunMedium } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface AppHeaderProps {
  themeLabel: string
  onToggleTheme: () => void
  onOpenHelp: () => void
}

export function AppHeader({ themeLabel, onToggleTheme, onOpenHelp }: AppHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">OshiNoGo</span>
            <span aria-hidden="true">·</span>
            <span>清音 · 条件反射</span>
          </div>
          <div className="flex items-start gap-2 text-sm leading-6 text-pink-700 dark:text-pink-200">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <p>kana 既是假名的 romaji，也是加奈的 romaji。对，作者就是加奈厨。</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenHelp}>
            <BookOpenText className="h-4 w-4" />
            使用说明
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleTheme}>
            {themeLabel.includes('夜间') ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
            {themeLabel}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.8rem]">
          五十音肌肉反应训练
        </h1>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">
          直接开练：先做 recognition 建立形→音，再做 dictation 练音→形，最后用 words 把单个假名反射迁移到整词。
        </p>
      </div>
    </header>
  )
}
