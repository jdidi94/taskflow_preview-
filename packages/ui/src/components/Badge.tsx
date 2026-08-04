import type { HTMLAttributes } from 'react'
import { cn } from '../utils'

export type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'outline'

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return <div className={cn('tf-badge', `tf-badge--${variant}`, className)} {...props} />
}
