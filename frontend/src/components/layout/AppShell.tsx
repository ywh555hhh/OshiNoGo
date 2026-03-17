import type { ReactNode } from 'react'

interface AppShellProps {
  header: ReactNode
  tabs: ReactNode
}

export function AppShell({ header, tabs }: AppShellProps) {
  return (
    <div className="min-h-screen px-3 py-3 sm:px-5 sm:py-4 lg:px-8 lg:py-5">
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        {header}
        {tabs}
      </div>
    </div>
  )
}
