import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

const TabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => (
  <TabsPrimitive.List
    className={cn('inline-flex h-auto w-full flex-wrap items-center justify-start gap-2 rounded-3xl bg-muted p-2 text-muted-foreground', className)}
    {...props}
  />
)

const TabsTrigger = ({ className, ...props }: TabsPrimitive.TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    className={cn(
      'inline-flex min-w-[10rem] flex-1 items-start justify-center rounded-[1.25rem] border border-transparent px-4 py-3 text-left text-sm font-medium transition-all data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
)

const TabsContent = ({ className, ...props }: TabsPrimitive.TabsContentProps) => (
  <TabsPrimitive.Content className={cn('mt-6 focus-visible:outline-none', className)} {...props} />
)

export { Tabs, TabsContent, TabsList, TabsTrigger }
