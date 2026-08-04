import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

import { fadeUpVariants, reduced, softSpring } from '@/lib/motion'

/** Light enter fade when board content remounts (e.g. view / board id change). */
export function ViewTransition({
  children,
  contentKey,
}: {
  children: ReactNode
  contentKey: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={contentKey}
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
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
