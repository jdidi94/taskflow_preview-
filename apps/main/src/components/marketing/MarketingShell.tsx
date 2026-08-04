import type { ReactNode } from 'react'

import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { MarketingNav } from '@/components/marketing/MarketingNav'

type Props = {
  children: ReactNode
}

export function MarketingShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <MarketingNav />
        {children}
      </div>
      <MarketingFooter />
    </div>
  )
}
