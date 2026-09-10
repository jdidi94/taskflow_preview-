import { useI18n } from '@/i18n'

export function BoardPageSkeleton() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t('common.loading')}</span>
      <div className="space-y-3">
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted/70" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="h-9 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-9 min-w-[12rem] flex-1 animate-pulse rounded-md bg-muted" />
      </div>
      <BoardColumnsSkeleton />
    </div>
  )
}

export function BoardColumnsSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex h-[28rem] w-72 shrink-0 flex-col gap-3 rounded-xl border border-border/60 bg-muted/35 p-3"
        >
          <div className="h-5 w-28 animate-pulse rounded bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted/80" />
          <div className="h-16 animate-pulse rounded-lg bg-muted/70" />
          <div className="h-16 animate-pulse rounded-lg bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

export function BoardRefetchBar({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="h-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/50" />
    </div>
  )
}
