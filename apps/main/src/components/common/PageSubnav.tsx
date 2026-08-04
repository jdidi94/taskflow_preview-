import { motion, useReducedMotion } from 'framer-motion'
import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { useI18n } from '@/i18n'
import { focusRingClassName } from '@/lib/focusRing'
import { reduced, snappySpring } from '@/lib/motion'

export type PageSubnavItem<T extends string = string> = {
  id: T
  label: string
  icon?: LucideIcon
}

type PageSubnavProps<T extends string> = {
  items: ReadonlyArray<PageSubnavItem<T>>
  value: T
  onChange: (value: T) => void
  /** Unique layoutId so multiple subnavs on different routes don’t clash. */
  layoutId: string
  ariaLabel: string
  className?: string
}

export function PageSubnav<T extends string>({
  items,
  value,
  onChange,
  layoutId,
  ariaLabel,
  className = '',
}: PageSubnavProps<T>) {
  const { isRTL } = useI18n()
  const reduceMotion = useReducedMotion()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function move(delta: number) {
    const index = items.findIndex((item) => item.id === value)
    if (index < 0) return
    const next = (index + delta + items.length) % items.length
    onChange(items[next]!.id)
    refs.current[next]?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const forward = isRTL ? 'ArrowLeft' : 'ArrowRight'
    const back = isRTL ? 'ArrowRight' : 'ArrowLeft'
    if (event.key === forward) {
      event.preventDefault()
      move(1)
    } else if (event.key === back) {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      onChange(items[0]!.id)
      refs.current[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      const last = items.length - 1
      onChange(items[last]!.id)
      refs.current[last]?.focus()
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`sticky top-14 z-20 -mx-1 overflow-x-auto px-1 pb-1 ${className}`}
    >
      <div className="inline-flex max-w-full min-w-0 rounded-lg border border-border/70 bg-muted/35 p-1 backdrop-blur-sm">
        {items.map(({ id, label, icon: Icon }, index) => {
          const selected = value === id
          return (
            <button
              key={id}
              ref={(node) => {
                refs.current[index] = node
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-current={selected ? 'page' : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(id)}
              className={`relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${focusRingClassName} sm:px-3 ${
                selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {selected ? (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-md border border-border/60 bg-background shadow-sm"
                  transition={reduced(snappySpring, reduceMotion)}
                  aria-hidden
                />
              ) : null}
              <span className="relative z-[1] inline-flex items-center gap-1.5">
                {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                <span className="whitespace-nowrap">{label}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Optional wrapper so tab panels keep a stable landmark. */
export function PageSubnavPanel({
  id,
  active,
  children,
  className = '',
}: {
  id: string
  active: boolean
  children: ReactNode
  className?: string
}) {
  if (!active) return null
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={id} className={className}>
      {children}
    </div>
  )
}
