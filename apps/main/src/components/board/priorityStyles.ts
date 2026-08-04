import type { MessageKey } from '@/i18n'
import type { TaskPriority } from '@/types/domain'

export const PRIORITY_KEYS: Record<TaskPriority, MessageKey> = {
  low: 'board.priorityLow',
  medium: 'board.priorityMedium',
  high: 'board.priorityHigh',
  critical: 'board.priorityCritical',
}

/** Inline-start color rail — theme tokens only. */
export const PRIORITY_RAIL: Record<TaskPriority, string> = {
  low: 'bg-muted-foreground/45',
  medium: 'bg-primary',
  high: 'bg-warning',
  critical: 'bg-destructive',
}

/** Border variant for compact chips (calendar). */
export const PRIORITY_BORDER: Record<TaskPriority, string> = {
  low: 'border-s-muted-foreground/45',
  medium: 'border-s-primary',
  high: 'border-s-warning',
  critical: 'border-s-destructive',
}

/** Tinted outline badge matching the rail. */
export const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: 'border-muted-foreground/35 text-muted-foreground',
  medium: 'border-primary/45 text-primary',
  high: 'border-warning/55 text-warning',
  critical: 'border-destructive/55 text-destructive',
}
