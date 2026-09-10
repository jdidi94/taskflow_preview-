import { useEffect, useState } from 'react'
import { Button, Input } from '@taskflow/ui'
import { Search, X } from 'lucide-react'

import type { NormalizedWorkspaceMember } from '@/components/workspace/normalizeMembers'
import { useI18n } from '@/i18n'
import { focusRingClassName } from '@/lib/focusRing'
import { BOARD_FILTER_SEARCH_ID } from '@/components/board/boardKeyboard'
import type { BoardDueFilter, BoardFilters, BoardPriorityFilter } from '@/components/board/boardFilters'

type Props = {
  filters: BoardFilters
  members: NormalizedWorkspaceMember[]
  matchCount: number
  totalCount: number
  onChange: (patch: Partial<BoardFilters>) => void
  onClear: () => void
  onOpenShortcuts?: () => void
}

const selectClassName = `h-9 max-w-full rounded-md border border-border/70 bg-background px-2.5 text-sm text-foreground ${focusRingClassName}`

export function BoardFilterBar({
  filters,
  members,
  matchCount,
  totalCount,
  onChange,
  onClear,
  onOpenShortcuts,
}: Props) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(filters.q)

  useEffect(() => {
    setDraft(filters.q)
  }, [filters.q])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (draft.trim() === filters.q.trim()) return
      onChange({ q: draft })
    }, 250)
    return () => window.clearTimeout(handle)
  }, [draft, filters.q, onChange])

  const active =
    Boolean(filters.q.trim()) ||
    filters.assignee !== 'all' ||
    filters.due !== 'all' ||
    filters.priority !== 'all'

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2" role="search" aria-label={t('board.filterLabel')}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">{t('board.filterSearch')}</span>
          <Search
            className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={BOARD_FILTER_SEARCH_ID}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('board.filterSearchPlaceholder')}
            className="h-9 ps-8"
          />
        </label>

        <label className="sr-only" htmlFor="board-filter-assignee">
          {t('board.filterAssignee')}
        </label>
        <select
          id="board-filter-assignee"
          className={selectClassName}
          value={filters.assignee}
          onChange={(event) => onChange({ assignee: event.target.value })}
        >
          <option value="all">{t('board.filterAssigneeAll')}</option>
          <option value="me">{t('board.filterAssigneeMe')}</option>
          <option value="unassigned">{t('board.filterAssigneeUnassigned')}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name || member.email}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="board-filter-due">
          {t('board.filterDue')}
        </label>
        <select
          id="board-filter-due"
          className={selectClassName}
          value={filters.due}
          onChange={(event) => onChange({ due: event.target.value as BoardDueFilter })}
        >
          <option value="all">{t('board.filterDueAll')}</option>
          <option value="overdue">{t('board.filterDueOverdue')}</option>
          <option value="today">{t('board.filterDueToday')}</option>
          <option value="week">{t('board.filterDueWeek')}</option>
          <option value="undated">{t('board.filterDueUndated')}</option>
        </select>

        <label className="sr-only" htmlFor="board-filter-priority">
          {t('board.filterPriority')}
        </label>
        <select
          id="board-filter-priority"
          className={selectClassName}
          value={filters.priority}
          onChange={(event) => onChange({ priority: event.target.value as BoardPriorityFilter })}
        >
          <option value="all">{t('board.filterPriorityAll')}</option>
          <option value="low">{t('board.priorityLow')}</option>
          <option value="medium">{t('board.priorityMedium')}</option>
          <option value="high">{t('board.priorityHigh')}</option>
          <option value="critical">{t('board.priorityCritical')}</option>
        </select>

        {onOpenShortcuts ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="px-2 font-mono"
            onClick={onOpenShortcuts}
            title={t('board.shortcutsHint')}
            aria-label={t('board.shortcutOpenSheet')}
          >
            ?
          </Button>
        ) : null}

        {active ? (
          <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={onClear}>
            <X className="h-3.5 w-3.5" aria-hidden />
            {t('board.filterClear')}
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {active
          ? t('board.filterMatchCount', { match: matchCount, total: totalCount })
          : t('board.filterTotalCount', { total: totalCount })}
      </p>
    </div>
  )
}
