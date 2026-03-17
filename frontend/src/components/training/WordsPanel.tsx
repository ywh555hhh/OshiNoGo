import { ChevronDown, ChevronUp, Headphones, Sparkles, Volume2 } from 'lucide-react'
import { useState } from 'react'

import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { WordsPreferences } from '@/hooks/useAppPreferences'
import { useSpeechCapability } from '@/hooks/useSpeechCapability'
import { useWordsPractice } from '@/hooks/useWordsPractice'
import { speakJapanese } from '@/lib/speech'

interface WordsPanelProps {
  preferences: WordsPreferences
  onPreferencesChange: (next: WordsPreferences | ((current: WordsPreferences) => WordsPreferences)) => void
}

interface AnswerCardProps {
  label: string
  value: string
}

export function WordsPanel({ preferences, onPreferencesChange }: WordsPanelProps) {
  const { answerVisible, count, current, nextWord, toggleAnswer } = useWordsPractice({ preferences, onPreferencesChange })
  const { capability, isUnsupported } = useSpeechCapability()
  const [playbackFeedback, setPlaybackFeedback] = useState('')

  function playWord(): void {
    if (!current) {
      return
    }

    const playback = speakJapanese(current.word)
    setPlaybackFeedback(playback.message)
  }

  function showNextWord(): void {
    setPlaybackFeedback('')
    nextWord()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>③ 纯平假名单词拼读</CardTitle>
          <CardDescription>
            把单个假名能力迁移到整词，训练看到词就能直接读出声音。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl border p-4 text-sm leading-6 text-muted-foreground">
            <div className="flex items-start gap-2 font-medium text-foreground">
              <Headphones className="mt-0.5 h-4 w-4" />
              <div>
                <div>{capability.label}</div>
                <div className="text-muted-foreground">{capability.hint}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-[1.75rem] border bg-muted/30 p-6 text-center sm:p-8">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">word focus</div>
              <div className="mt-4 break-all text-[2.5rem] font-semibold tracking-[0.2em] sm:text-[3.5rem]">{current?.word ?? '—'}</div>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button size="lg" onClick={playWord} disabled={isUnsupported || !current}>
                  <Volume2 className="h-5 w-5" />
                  播放读音
                </Button>
                <Button variant="outline" size="lg" onClick={showNextWord}>
                  换一个单词
                </Button>
              </div>
              <div className="mt-4 min-h-6 text-sm text-muted-foreground" aria-live="polite" role="status">
                {playbackFeedback || '先自己读一遍，再播放对照。'}
              </div>
            </div>

            <div className="space-y-4 rounded-[1.75rem] border bg-background p-4">
              <div className="rounded-2xl border border-dashed p-4 text-sm leading-6 text-muted-foreground">
                先尝试自己读，再看答案。这个区域保留一点轻梗：当你练的是 kana，也是在练你的 Kana 记忆点。
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/10 text-primary">已练 {count} 个单词</Badge>
                <Badge className="bg-pink-400/10 text-pink-700 dark:text-pink-200">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  有马加奈特别席位
                </Badge>
              </div>
              <div className="rounded-2xl border bg-muted/25 p-4 text-sm text-muted-foreground">
                {current ? '建议顺序：先自己读一次，再播放，再对照答案。' : '当前词库为空，无法继续训练。'}
              </div>
              <Button variant="outline" onClick={toggleAnswer} aria-expanded={answerVisible}>
                {answerVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {answerVisible ? '隐藏答案' : '显示答案'}
              </Button>
            </div>
          </div>

          <Collapsible open={answerVisible}>
            <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
              <div className="grid gap-4 rounded-[1.75rem] border bg-card p-5 md:grid-cols-2">
                <AnswerCard label="罗马音" value={current?.romaji ?? '-'} />
                <AnswerCard label="中文释义" value={current?.meaning ?? '-'} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  )
}

function AnswerCard({ label, value }: AnswerCardProps) {
  return (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  )
}
