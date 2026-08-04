import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../utils'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={cn('tf-input', className)} {...props} />
  ),
)
Input.displayName = 'Input'
