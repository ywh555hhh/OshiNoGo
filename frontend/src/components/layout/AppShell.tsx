import type { ReactNode } from 'react'

interface AppShellProps {
  header: ReactNode
  tabs: ReactNode
}

export function AppShell({ header, tabs }: AppShellProps) {
  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="container max-w-6xl space-y-6">
        <div className="rounded-[2rem] border border-white/20 bg-background/80 p-4 shadow-panel backdrop-blur sm:p-6 lg:p-8">
          <div className="space-y-6">
            {header}
            {tabs}
          </div>
        </div>
      </div>
    </div>
  )
}
