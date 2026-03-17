import type { ReactNode } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TrainingMode } from '@/types/training'

interface ModeTabsProps {
  mode: TrainingMode
  onModeChange: (mode: TrainingMode) => void
  recognition: ReactNode
  dictation: ReactNode
  words: ReactNode
}

const MODE_COPY: Record<TrainingMode, { index: string; title: string; description: string; helper: string }> = {
  recognition: {
    index: '①',
    title: '乱序认读',
    description: '看形 → 罗马音',
    helper: '最适合第一次开始，先把假名反应速度拉起来。',
  },
  dictation: {
    index: '②',
    title: '乱序听写',
    description: '听音 → 假名',
    helper: '依赖浏览器本地语音，适合在认读稳定后继续加压。',
  },
  words: {
    index: '③',
    title: '单词拼读',
    description: '整词 → 发音',
    helper: '轻量迁移训练，用整词检查你是否真的读顺了。',
  },
}

export function ModeTabs({ mode, onModeChange, recognition, dictation, words }: ModeTabsProps) {
  return (
    <Tabs value={mode} onValueChange={(value) => onModeChange(value as TrainingMode)}>
      <TabsContent value="recognition" className="mt-0">
        {recognition}
      </TabsContent>
      <TabsContent value="dictation" className="mt-0">
        {dictation}
      </TabsContent>
      <TabsContent value="words" className="mt-0">
        {words}
      </TabsContent>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <div>{MODE_COPY[mode].helper}</div>
          <div className="mt-1 text-xs text-muted-foreground/90 sm:text-sm">推荐顺序：recognition → dictation → words</div>
        </div>

        <TabsList className="grid w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3">
          {Object.entries(MODE_COPY).map(([value, copy]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="min-h-[72px] justify-start rounded-2xl border bg-muted/35 px-4 py-3 data-[state=active]:bg-background"
            >
              <div className="flex items-start gap-3 text-left">
                <span className="pt-0.5 text-xs text-muted-foreground">{copy.index}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{copy.title}</span>
                  <span className="block text-xs text-muted-foreground">{copy.description}</span>
                </span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  )
}
