import { Badge } from '@taskflow/ui'
import type { ReactNode } from 'react'

type MyTasksSectionProps = {
  title: string
  count: number
  children: ReactNode
}

export function MyTasksSection({ title, count, children }: MyTasksSectionProps) {
  if (count === 0) return null

  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-card/30">
      <header className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <Badge variant="secondary" className="tabular-nums text-[10px]">
          {count}
        </Badge>
      </header>
      {children}
    </section>
  )
}
