import type { Transition, Variants } from 'framer-motion'

/** Soft spring — route / panel enter. */
export const softSpring: Transition = {
  type: 'spring',
  stiffness: 120,
  damping: 22,
  mass: 0.8,
}

/** Snappy spring — switches, rails, compact chrome. */
export const snappySpring: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.7,
}

/** Tap feedback. */
export const tapSpring: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 28,
}

export const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 },
}

export const panelVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: 10, scale: 0.98 },
}

export const drawerBackdropVariants: Variants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
}

export function reduced(transition: Transition, reduceMotion: boolean | null): Transition {
  if (reduceMotion) return { duration: 0 }
  return transition
}
