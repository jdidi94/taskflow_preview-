import { PRIORITY_RAIL } from '@/components/board/priorityStyles'
import type { TaskPriority } from '@/types/domain'

type PriorityRailProps = {
  priority: TaskPriority
  className?: string
}

/** Absolute inline-start rail; parent must be `relative` + `overflow-hidden` (or clip). */
export function PriorityRail({ priority, className = 'w-1.5' }: PriorityRailProps) {
  return (
    <div
      className={`absolute inset-y-0 start-0 ${PRIORITY_RAIL[priority]} ${className}`}
      aria-hidden
    />
  )
}
