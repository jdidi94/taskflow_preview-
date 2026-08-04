import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  description?: string
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeOnEscape, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="tf-modal-overlay"
      role="presentation"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={cn('tf-modal', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'tf-modal-title' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <h2 id="tf-modal-title" className="tf-modal__title">
            {title}
          </h2>
        ) : null}
        {description ? <p className="tf-modal__desc">{description}</p> : null}
        {children}
      </div>
    </div>,
    document.body,
  )
}
