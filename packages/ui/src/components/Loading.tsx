import type { HTMLAttributes } from 'react'
import { cn } from '../utils'

export type SpinnerSize = 'sm' | 'md' | 'lg'

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
}

export interface SpinnerProps {
  size?: SpinnerSize
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const px = sizeMap[size]
  return (
    <svg
      className={cn('tf-spinner', className)}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        opacity="0.75"
      />
    </svg>
  )
}

export interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  label?: string
  fullScreen?: boolean
  size?: SpinnerSize
}

export function Loading({
  label = 'Loading…',
  fullScreen = false,
  size = 'md',
  className,
  ...props
}: LoadingProps) {
  return (
    <div
      className={cn('tf-loading', fullScreen && 'tf-loading--fullscreen', className)}
      role="status"
      {...props}
    >
      <Spinner size={size} />
      <span>{label}</span>
    </div>
  )
}
