import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { PageBreadcrumbs, type PageCrumb } from '@/components/common/PageBreadcrumbs'
import { reduced } from '@/lib/motion'

type PageHeroProps = {
  breadcrumbs?: PageCrumb[]
  title: string
  description: string
  /** Primary CTA — one clear action for the page. */
  action?: ReactNode
  /** Secondary controls (archive, etc.) — kept quieter than the primary CTA. */
  secondary?: ReactNode
  meta?: ReactNode
}

export function PageHero({
  breadcrumbs,
  title,
  description,
  action,
  secondary,
  meta,
}: PageHeroProps) {
  const reduceMotion = useReducedMotion()

  return (
    <section className="flex flex-col gap-1">
      {breadcrumbs?.length ? <PageBreadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          {meta ? <div className="mb-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
          <motion.h1
            className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced({ duration: 0.35, ease: [0.22, 1, 0.36, 1] }, reduceMotion)}
          >
            {title}
          </motion.h1>
          <motion.p
            className="mt-2 text-sm text-muted-foreground sm:text-base"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced(
              { duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] },
              reduceMotion,
            )}
          >
            {description}
          </motion.p>
        </div>
        {action || secondary ? (
          <motion.div
            className="flex flex-wrap items-center gap-2"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced({ duration: 0.3, delay: 0.08 }, reduceMotion)}
          >
            {secondary}
            {action}
          </motion.div>
        ) : null}
      </div>
    </section>
  )
}
