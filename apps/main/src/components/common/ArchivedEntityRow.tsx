import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@taskflow/ui'
import { MoreHorizontal, RotateCcw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useI18n } from '@/i18n'

export type EntityActionItem = {
  id: string
  label: string
  icon: LucideIcon
  onSelect: () => void
}

type EntityActionMenuProps = {
  label?: string
  items: EntityActionItem[]
}

export function EntityActionMenu({ label, items }: EntityActionMenuProps) {
  const { t } = useI18n()
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-muted-foreground"
        aria-label={label ?? t('archive.actions')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </Button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 top-full z-20 mt-1 min-w-40 overflow-hidden rounded-md border border-border/70 bg-background py-1 shadow-md"
        >
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-foreground hover:bg-muted"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setOpen(false)
                  item.onSelect()
                }}
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {item.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

type ArchivedEntityRowProps = {
  title: string
  description?: string
  to: string
  onRestore: () => void
  meta?: ReactNode
}

const REVEAL_PX = 96

export function ArchivedEntityRow({
  title,
  description,
  to,
  onRestore,
  meta,
}: ArchivedEntityRowProps) {
  const { t, isRTL } = useI18n()
  const [reveal, setReveal] = useState(0)
  const dragRef = useRef<{ startX: number; startReveal: number; active: boolean } | null>(null)

  function clampReveal(value: number) {
    return Math.max(0, Math.min(REVEAL_PX, value))
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // Desktop uses the menu; swipe is for touch / pen.
    if (event.pointerType === 'mouse') return
    dragRef.current = { startX: event.clientX, startReveal: reveal, active: true }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag?.active) return
    const delta = event.clientX - drag.startX
    const towardStart = isRTL ? delta : -delta
    setReveal(clampReveal(drag.startReveal + towardStart))
  }

  function endDrag() {
    const drag = dragRef.current
    if (!drag) return
    drag.active = false
    setReveal((current) => (current > REVEAL_PX * 0.45 ? REVEAL_PX : 0))
    dragRef.current = null
  }

  const contentShift = isRTL ? reveal : -reveal

  return (
    <div className="relative overflow-hidden rounded-lg bg-muted/30">
      <div className="absolute inset-y-0 end-0 flex w-24 items-stretch">
        <button
          type="button"
          className="flex w-full flex-col items-center justify-center gap-1 bg-primary px-2 text-xs font-medium text-primary-foreground"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setReveal(0)
            onRestore()
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {t('archive.restore')}
        </button>
      </div>

      <div
        className="relative flex items-center gap-2 border border-dashed border-border/50 bg-muted/40 px-3 py-3 transition-transform duration-150 ease-out touch-pan-y"
        style={{ transform: `translateX(${contentShift}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <Link to={to} className="min-w-0 flex-1 pe-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
            {meta}
          </div>
          {description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/80">{description}</p>
          ) : null}
          <p className="mt-1 text-[10px] text-muted-foreground/70 sm:hidden">{t('archive.swipeHint')}</p>
        </Link>
        <EntityActionMenu
          items={[
            {
              id: 'restore',
              label: t('archive.restore'),
              icon: RotateCcw,
              onSelect: onRestore,
            },
          ]}
        />
      </div>
    </div>
  )
}
