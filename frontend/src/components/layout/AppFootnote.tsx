import { ImageIcon, Sparkles } from 'lucide-react'

import { KANA_PLACEHOLDER_SRC, FOOTNOTE_COPY } from '@/content/siteCopy'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export function AppFootnote() {
  return (
    <Card className="overflow-hidden border-pink-400/20 bg-gradient-to-br from-pink-400/5 via-background to-background shadow-none">
      <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-8">
        <section className="space-y-4">
          <Badge className="w-fit border-pink-400/20 bg-pink-400/10 text-pink-700 dark:text-pink-200">{FOOTNOTE_COPY.badge}</Badge>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{FOOTNOTE_COPY.title}</h2>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">{FOOTNOTE_COPY.lead}</p>
          </div>

          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            {FOOTNOTE_COPY.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>

          <div className="rounded-2xl border border-pink-400/20 bg-pink-400/8 p-4 text-sm leading-6 text-pink-700 dark:text-pink-200">
            <div className="flex items-start gap-2 font-medium">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div>{FOOTNOTE_COPY.asideTitle}</div>
                <p className="mt-2 font-normal">{FOOTNOTE_COPY.asideBody}</p>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ImageIcon className="h-4 w-4 text-pink-600 dark:text-pink-300" />
            {FOOTNOTE_COPY.placeholderTitle}
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-background/80">
            <div className="aspect-[4/5] bg-muted/20">
              <img src={KANA_PLACEHOLDER_SRC} alt={FOOTNOTE_COPY.placeholderAlt} className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="space-y-2 text-sm leading-6 text-muted-foreground">
            <p>{FOOTNOTE_COPY.placeholderCaption}</p>
            <p className="font-medium text-foreground/80">{FOOTNOTE_COPY.placeholderPathHint}</p>
          </div>
        </aside>
      </CardContent>
    </Card>
  )
}
