import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button, Input } from '@taskflow/ui'
import { Plus } from 'lucide-react'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'

type Props = {
  disabled?: boolean
  compact?: boolean
  autoOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSubmit: (title: string) => Promise<void>
  onMore?: () => void
  onClose?: () => void
}

export function ColumnQuickAdd({
  disabled,
  compact,
  autoOpen,
  open: openProp,
  onOpenChange,
  onSubmit,
  onMore,
  onClose,
}: Props) {
  const { t } = useI18n()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(Boolean(autoOpen))
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const controlled = Boolean(onOpenChange)
  const open = controlled ? Boolean(openProp) : uncontrolledOpen

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function setOpen(next: boolean) {
    if (controlled) onOpenChange?.(next)
    else setUncontrolledOpen(next)
  }

  function collapse() {
    setOpen(false)
    setTitle('')
    setError(null)
    onClose?.()
  }

  async function submit() {
    const value = title.trim()
    if (!value || busy || disabled) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(value)
      setTitle('')
      inputRef.current?.focus()
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.quickAddError')))
    } finally {
      setBusy(false)
    }
  }

  function onFormSubmit(event: FormEvent) {
    event.preventDefault()
    void submit()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      collapse()
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={compact ? 'h-7 gap-1 px-2 text-[11px]' : 'mt-3 gap-1.5'}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Plus className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
        {t('board.addTask')}
      </Button>
    )
  }

  return (
    <form
      onSubmit={onFormSubmit}
      className={compact ? 'space-y-1' : 'mt-3 space-y-1.5'}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <Input
        ref={inputRef}
        value={title}
        disabled={busy || disabled}
        placeholder={t('board.quickAddPlaceholder')}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
        className={compact ? 'h-7 px-2 text-xs' : 'h-9'}
        aria-label={t('board.taskTitle')}
      />
      <div className="flex flex-wrap items-center gap-1">
        <Button type="submit" size="sm" disabled={busy || disabled || !title.trim()} className={compact ? 'h-7 px-2 text-[11px]' : undefined}>
          {busy ? t('board.saving') : t('board.addTask')}
        </Button>
        {onMore ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy || disabled}
            className={compact ? 'h-7 px-2 text-[11px]' : undefined}
            onClick={onMore}
          >
            {t('board.quickAddMore')}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          className={compact ? 'h-7 px-2 text-[11px]' : undefined}
          onClick={collapse}
        >
          {t('common.close')}
        </Button>
      </div>
      {compact ? null : <p className="text-[10px] text-muted-foreground">{t('board.quickAddHint')}</p>}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  )
}
