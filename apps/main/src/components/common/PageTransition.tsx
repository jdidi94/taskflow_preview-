import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, Outlet } from 'react-router'
import type { ReactNode } from 'react'

import { fadeUpVariants, reduced, softSpring } from '@/lib/motion'

export const fadeVariants = fadeUpVariants
export const pageTransition = softSpring

export function AnimatedPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={
        reduceMotion
          ? {
              initial: { opacity: 0 },
              in: { opacity: 1 },
              out: { opacity: 0 },
            }
          : fadeUpVariants
      }
      transition={reduced(softSpring, reduceMotion)}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Route-keyed enter/exit around nested `<Outlet />`. */
export function AnimatedOutlet({ className }: { className?: string }) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <AnimatedPage key={location.pathname} className={className}>
        <Outlet />
      </AnimatedPage>
    </AnimatePresence>
  )
}
