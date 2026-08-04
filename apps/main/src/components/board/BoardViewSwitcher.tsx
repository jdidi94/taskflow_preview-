import { motion, useReducedMotion } from 'framer-motion'
import { Calendar, CalendarRange, Columns3, List } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'

import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { reduced, snappySpring } from '@/lib/motion'

export type BoardViewMode = 'kanban' | 'list' | 'calendar' | 'timeline'

type BoardViewSwitcherProps = {
  value: BoardViewMode
  onChange: (value: BoardViewMode) => void
}

const options: Array<{ value: BoardViewMode; icon: typeof Columns3; labelKey: MessageKey }> = [
  { value: 'kanban', icon: Columns3, labelKey: 'board.viewKanban' },
  { value: 'list', icon: List, labelKey: 'board.viewList' },
  { value: 'calendar', icon: Calendar, labelKey: 'board.viewCalendar' },
  { value: 'timeline', icon: CalendarRange, labelKey: 'board.viewTimeline' },
]

export function BoardViewSwitcher({ value, onChange }: BoardViewSwitcherProps) {
  const { t, isRTL } = useI18n()
  const reduceMotion = useReducedMotion()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function move(delta: number) {
    const index = options.findIndex((option) => option.value === value)
    if (index < 0) return
    const next = (index + delta + options.length) % options.length
    onChange(options[next]!.value)
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
      onChange(options[0]!.value)
      refs.current[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      const last = options.length - 1
      onChange(options[last]!.value)
      refs.current[last]?.focus()
    }
  }

  return (
    <div
      role="tablist"
      aria-label={t('board.viewSwitcher')}
      onKeyDown={onKeyDown}
      className="inline-flex max-w-full rounded-lg border border-border/70 bg-muted/35 p-1"
    >
      {options.map(({ value: option, icon: Icon, labelKey }, index) => {
        const selected = value === option
        const label = t(labelKey)
        return (
          <button
            key={option}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option)}
            className={`relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3 ${
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {selected ? (
              <motion.span
                layoutId="board-view-segment"
                className="absolute inset-0 rounded-md border border-border/60 bg-background shadow-sm"
                transition={reduced(snappySpring, reduceMotion)}
                aria-hidden
              />
            ) : null}
            <span className="relative z-[1] inline-flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
              <span className="sr-only sm:hidden">{label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
