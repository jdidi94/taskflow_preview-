import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@taskflow/ui'
import { X } from 'lucide-react'

import { useI18n } from '@/i18n'

export type ToastInput = {
  message: string
  variant?: 'default' | 'error'
  durationMs?: number
}

type ToastItem = ToastInput & { id: string }

type ToastContextValue = {
  show: (toast: ToastInput) => string
  error: (message: string) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (toast: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setToasts((prev) => [{ ...toast, id }, ...prev].slice(0, 4))
      const duration = toast.durationMs ?? (toast.variant === 'error' ? 5000 : 4000)
      if (duration > 0) window.setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const error = useCallback((message: string) => show({ message, variant: 'error' }), [show])
  const value = useMemo(() => ({ show, error, dismiss }), [show, error, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document === 'undefined'
        ? null
        : createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:end-4 sm:items-end"
              aria-live="polite"
            >
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 ${
                    toast.variant === 'error'
                      ? 'border-destructive/40 text-destructive'
                      : 'border-border/70 text-foreground'
                  }`}
                  role={toast.variant === 'error' ? 'alert' : 'status'}
                >
                  <p className="min-w-0 flex-1">{toast.message}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 p-0"
                    aria-label={t('common.close')}
                    onClick={() => dismiss(toast.id)}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>,
            document.body,
          )}
    </ToastContext.Provider>
  )
}
