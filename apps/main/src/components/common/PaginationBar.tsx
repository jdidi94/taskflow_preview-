import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useI18n } from '@/i18n'
import { focusRingClassName } from '@/lib/focusRing'
import type { ListPagination } from '@/types/pagination'

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48] as const

type PaginationBarProps = {
  pagination: ListPagination
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
  /** Hide when only one page and no page-size control needed. */
  alwaysShow?: boolean
  className?: string
  pageSizeOptions?: readonly number[]
}

function visiblePages(current: number, total: number, max = 5): number[] {
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1)
  const half = Math.floor(max / 2)
  let start = Math.max(1, current - half)
  let end = Math.min(total, start + max - 1)
  if (end - start + 1 < max) start = Math.max(1, end - max + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function PaginationBar({
  pagination,
  onPageChange,
  onLimitChange,
  alwaysShow = false,
  className = '',
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: PaginationBarProps) {
  const { t, isRTL } = useI18n()
  const { page, pages, totalItems, limit, hasMore } = pagination

  if (!alwaysShow && pages <= 1 && !onLimitChange) return null
  if (totalItems === 0) return null

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft
  const NextIcon = isRTL ? ChevronLeft : ChevronRight
  const numbers = visiblePages(page, pages)
  const from = totalItems === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, totalItems)

  return (
    <nav
      aria-label={t('pagination.label')}
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-xs text-muted-foreground sm:text-sm">
        {t('pagination.summary', { from, to, total: totalItems })}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onLimitChange ? (
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="sr-only sm:not-sr-only">{t('pagination.pageSize')}</span>
            <select
              className={`h-8 rounded-md border border-border bg-background px-2 text-foreground ${focusRingClassName}`}
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              aria-label={t('pagination.pageSize')}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
              {!(pageSizeOptions as readonly number[]).includes(limit) ? (
                <option value={limit}>{limit}</option>
              ) : null}
            </select>
          </label>
        ) : null}

        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-border transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 ${focusRingClassName}`}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={t('pagination.prev')}
          >
            <PrevIcon className="h-4 w-4" aria-hidden />
          </button>

          {numbers[0]! > 1 ? (
            <>
              <PageButton page={1} current={page} onPageChange={onPageChange} />
              {numbers[0]! > 2 ? (
                <span className="px-1 text-xs text-muted-foreground" aria-hidden>
                  …
                </span>
              ) : null}
            </>
          ) : null}

          {numbers.map((n) => (
            <PageButton key={n} page={n} current={page} onPageChange={onPageChange} />
          ))}

          {numbers[numbers.length - 1]! < pages ? (
            <>
              {numbers[numbers.length - 1]! < pages - 1 ? (
                <span className="px-1 text-xs text-muted-foreground" aria-hidden>
                  …
                </span>
              ) : null}
              <PageButton page={pages} current={page} onPageChange={onPageChange} />
            </>
          ) : null}

          <button
            type="button"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-border transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 ${focusRingClassName}`}
            disabled={!hasMore && page >= pages}
            onClick={() => onPageChange(page + 1)}
            aria-label={t('pagination.next')}
          >
            <NextIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </nav>
  )
}

function PageButton({
  page,
  current,
  onPageChange,
}: {
  page: number
  current: number
  onPageChange: (page: number) => void
}) {
  const selected = page === current
  return (
    <button
      type="button"
      aria-current={selected ? 'page' : undefined}
      onClick={() => onPageChange(page)}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition ${focusRingClassName} ${
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-foreground hover:bg-muted'
      }`}
    >
      {page}
    </button>
  )
}
