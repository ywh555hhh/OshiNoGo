import { CheckCircle2, Headphones, MonitorSmartphone, Sparkles } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface OnboardingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function OnboardingDialog({ open, onOpenChange, onComplete }: OnboardingDialogProps) {
  const startButtonRef = useRef<HTMLButtonElement | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          startButtonRef.current?.focus({ preventScroll: true })
        }}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <DialogTitle>欢迎来到 OshiNoGo 假名训练场</DialogTitle>
          <DialogDescription>
            第一次打开先看这一页就够了：知道从哪开始、哪些功能依赖浏览器语音、以及哪些数据会保存在本地。
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid gap-3 md:grid-cols-3">
            <GuideCard
              title="① recognition"
              description="最推荐先开始。看到单个假名，立刻写出 romaji，把形→音练成条件反射。"
            />
            <GuideCard
              title="② dictation"
              description="听到发音后写出假名。依赖浏览器本地 speechSynthesis，语音不足时页面会明确提醒。"
            />
            <GuideCard
              title="③ words"
              description="用纯平假名单词做轻量迁移训练，检查你能不能把单字反应带进整词。"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InfoBlock
              icon={<Headphones className="h-4 w-4" />}
              title="语音边界"
              body="dictation 和 words 使用浏览器原生语音，不走后端 TTS。不同浏览器和系统语音包效果会不同。"
            />
            <InfoBlock
              icon={<MonitorSmartphone className="h-4 w-4" />}
              title="保存边界"
              body="主题、上次模式、训练偏好、累计统计和最近一次摘要只保存在当前浏览器 localStorage。换设备不会自动同步。"
            />
          </div>

          <div className="rounded-2xl border border-pink-400/20 bg-pink-400/8 p-4 text-sm leading-6 text-pink-700 dark:text-pink-200">
            <div className="flex items-start gap-2 font-medium">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div>作者署名</div>
                <p className="mt-2 font-normal">
                  这里写的 Kana，不只是练假名时顺带冒出来的梗。kana 是假名的 romaji，也是作者留给所有用户的 Kana 署名：对，作者就是加奈厨。
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            稍后再看
          </Button>
          <Button ref={startButtonRef} onClick={onComplete}>
            <CheckCircle2 className="h-4 w-4" />
            我知道怎么开始了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GuideCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function InfoBlock({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  )
}
