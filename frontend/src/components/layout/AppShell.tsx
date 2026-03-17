import type { ReactNode } from 'react'

interface AppShellProps {
  header: ReactNode
  tabs: ReactNode
}

export function AppShell({ header, tabs }: AppShellProps) {
  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {header}
        {tabs}
      </div>
    </div>
  )
}
