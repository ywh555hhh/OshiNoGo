import { BookOpenText, MoonStar, SunMedium } from 'lucide-react'

import { HEADER_COPY } from '@/content/siteCopy'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface AppHeaderProps {
  themeLabel: string
  isDarkTheme: boolean
  onToggleTheme: () => void
  onOpenHelp: () => void
}

export function AppHeader({ themeLabel, isDarkTheme, onToggleTheme, onOpenHelp }: AppHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">OshiNoGo</span>
            <span aria-hidden="true">·</span>
            <span>{HEADER_COPY.eyebrow}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {HEADER_COPY.modeBadges.map((badge) => (
              <Badge key={badge} className="bg-muted/60 text-muted-foreground">
                {badge}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenHelp}>
            <BookOpenText className="h-4 w-4" />
            使用说明
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleTheme}>
            {isDarkTheme ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
            {themeLabel}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.8rem]">
          {HEADER_COPY.title}
        </h1>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">{HEADER_COPY.description}</p>
      </div>
    </header>
  )
}
