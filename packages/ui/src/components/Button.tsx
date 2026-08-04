import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../utils'

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn('tf-btn', `tf-btn--${variant}`, `tf-btn--${size}`, className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
