import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

import { reduced } from '@/lib/motion'

type EmptyStateProps = {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className = '',
  compact = false,
}: EmptyStateProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced({ duration: 0.35, ease: [0.22, 1, 0.36, 1] }, reduceMotion)}
      className={`relative overflow-hidden rounded-xl border border-border/50 ${
        compact ? 'px-4 py-8' : 'px-5 py-12 sm:px-8 sm:py-14'
      } ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,hsl(var(--primary)/0.12),transparent_55%),radial-gradient(ellipse_at_90%_100%,hsl(var(--muted-foreground)/0.08),transparent_50%),linear-gradient(180deg,hsl(var(--muted)/0.45),hsl(var(--background)/0.2))]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-8 -top-10 h-36 w-36 rounded-full bg-primary/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -start-6 h-40 w-40 rounded-full bg-muted-foreground/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
        {Icon ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduced({ duration: 0.4, delay: 0.05 }, reduceMotion)}
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-background/70 text-primary shadow-sm backdrop-blur-sm"
          >
            <Icon className="h-5 w-5" aria-hidden />
          </motion.div>
        ) : null}
        <h3 className="font-display text-base font-semibold tracking-tight sm:text-lg">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        ) : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </motion.div>
  )
}
