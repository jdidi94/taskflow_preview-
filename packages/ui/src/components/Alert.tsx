import { forwardRef, type HTMLAttributes } from 'react'
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '../utils'

export type AlertVariant = 'warning' | 'error' | 'success' | 'info'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title?: string
  description?: string
  onClose?: () => void
  showIcon?: boolean
  showCloseButton?: boolean
}

const icons = {
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant = 'info',
      title,
      description,
      onClose,
      className,
      showIcon = true,
      showCloseButton = false,
      children,
      ...props
    },
    ref,
  ) => {
    const Icon = icons[variant]

    return (
      <div
        ref={ref}
        role="alert"
        className={cn('tf-alert', `tf-alert--${variant}`, className)}
        {...props}
      >
        {showIcon ? <Icon size={18} aria-hidden /> : null}
        <div className="tf-alert__body">
          {title ? <p className="tf-alert__title">{title}</p> : null}
          {description ? <p className="tf-alert__desc">{description}</p> : null}
          {children}
        </div>
        {showCloseButton && onClose ? (
          <button type="button" className="tf-alert__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        ) : null}
      </div>
    )
  },
)
Alert.displayName = 'Alert'
