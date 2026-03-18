import { CheckCircle2, Headphones, Languages, MonitorSmartphone, Sparkles } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import { ONBOARDING_COPY } from '@/content/siteCopy'
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
          <DialogTitle>{ONBOARDING_COPY.title}</DialogTitle>
          <DialogDescription>{ONBOARDING_COPY.description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid gap-3 md:grid-cols-3">
            {ONBOARDING_COPY.guideCards.map((card) => (
              <GuideCard key={card.title} title={card.title} description={card.description} />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InfoBlock
              icon={<Languages className="h-4 w-4" />}
              title={ONBOARDING_COPY.specialKanaTitle}
              body={
                <ul className="space-y-1.5">
                  {ONBOARDING_COPY.specialKanaPoints.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              }
            />
            <InfoBlock
              icon={<Sparkles className="h-4 w-4" />}
              title={ONBOARDING_COPY.mindsetTitle}
              body={
                <ul className="space-y-1.5">
                  {ONBOARDING_COPY.mindsetPoints.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              }
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InfoBlock
              icon={<Headphones className="h-4 w-4" />}
              title={ONBOARDING_COPY.speechTitle}
              body={ONBOARDING_COPY.speechBody}
            />
            <InfoBlock
              icon={<MonitorSmartphone className="h-4 w-4" />}
              title={ONBOARDING_COPY.storageTitle}
              body={ONBOARDING_COPY.storageBody}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {ONBOARDING_COPY.dismissLabel}
          </Button>
          <Button ref={startButtonRef} onClick={onComplete}>
            <CheckCircle2 className="h-4 w-4" />
            {ONBOARDING_COPY.confirmLabel}
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
  body: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{body}</div>
    </div>
  )
}
