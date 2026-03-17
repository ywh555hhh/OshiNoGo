import { BookOpenText, MoonStar, Sparkles, SunMedium } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface AppHeaderProps {
  themeLabel: string
  onToggleTheme: () => void
  onOpenHelp: () => void
}

export function AppHeader({ themeLabel, onToggleTheme, onOpenHelp }: AppHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border-primary/20 bg-primary/10 px-4 py-1 text-primary">
            OshiNoGo
          </Badge>
          <Badge className="rounded-full border-pink-400/20 bg-pink-400/10 px-4 py-1 text-pink-600 dark:text-pink-300">
            清音 · 条件反射
          </Badge>
          <Badge className="rounded-full border-amber-400/20 bg-amber-400/10 px-4 py-1 text-amber-700 dark:text-amber-300">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            彩蛋：kana 也是 Kana
          </Badge>
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

      <div className="space-y-3">
        <div className="space-y-2">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            五十音肌肉反应训练
          </h1>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">
            第一次打开就能直接开练：先做 recognition 建立形→音，再做 dictation 练音→形，最后用 words 把单个假名反射迁移到整词。
            训练偏好和基础进度只保存在当前浏览器，本项目继续保留那一点点 Kana 彩蛋浓度。
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground sm:text-sm">
          <span className="rounded-full border bg-background px-3 py-1.5">① recognition：看形 → 罗马音</span>
          <span className="rounded-full border bg-background px-3 py-1.5">② dictation：听音 → 假名</span>
          <span className="rounded-full border bg-background px-3 py-1.5">③ words：整词 → 发音</span>
          <span className="rounded-full border border-pink-400/20 bg-pink-400/10 px-3 py-1.5 text-pink-700 dark:text-pink-300">
            kana 既是假名的 romaji，也是你喜欢的加奈的 romaji
          </span>
        </div>
      </div>
    </header>
  )
}
