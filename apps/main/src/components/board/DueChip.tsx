import { Calendar } from 'lucide-react'

import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n'

export type DueTone = 'overdue' | 'today' | 'tomorrow' | 'later'

export function dueToneFromIso(iso: string, now = new Date()): DueTone {
  const due = new Date(iso)
  if (Number.isNaN(due.getTime())) return 'later'

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.round((startDue.getTime() - startToday.getTime()) / 86_400_000)

  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  return 'later'
}

const TONE_CLASS: Record<DueTone, string> = {
  overdue: 'border-destructive/40 bg-destructive/10 text-destructive',
  today: 'border-warning/45 bg-warning/10 text-warning',
  tomorrow: 'border-primary/40 bg-primary/10 text-primary',
  later: 'border-border/70 bg-muted/60 text-muted-foreground',
}

const TONE_HINT: Record<DueTone, MessageKey> = {
  overdue: 'board.dueOverdue',
  today: 'board.dueToday',
  tomorrow: 'board.dueTomorrow',
  later: 'board.dueDate',
}

type DueChipProps = {
  dueDate: string
  className?: string
}

export function DueChip({ dueDate, className = '' }: DueChipProps) {
  const { t, locale } = useI18n()
  const tone = dueToneFromIso(dueDate)
  const date = new Date(dueDate)
  if (Number.isNaN(date.getTime())) return null

  const shortDate = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  const label =
    tone === 'overdue'
      ? t('board.dueOverdue')
      : tone === 'today'
        ? t('board.dueToday')
        : tone === 'tomorrow'
          ? t('board.dueTomorrow')
          : shortDate

  const hint = `${t(TONE_HINT[tone])}: ${shortDate}`

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${TONE_CLASS[tone]} ${className}`}
      title={hint}
      aria-label={hint}
    >
      <Calendar className="size-3 shrink-0 opacity-80" aria-hidden />
      {label}
    </span>
  )
}
