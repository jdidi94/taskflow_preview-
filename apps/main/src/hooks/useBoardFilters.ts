import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  boardFiltersActive,
  parseBoardFilters,
  writeBoardFilters,
  type BoardFilters,
} from '@/components/board/boardFilters'

export function useBoardFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => parseBoardFilters(searchParams), [searchParams])
  const active = boardFiltersActive(filters)

  const setFilters = useCallback(
    (patch: Partial<BoardFilters>) => {
      const next = writeBoardFilters(searchParams, { ...filters, ...patch })
      setSearchParams(next, { replace: true })
    },
    [filters, searchParams, setSearchParams],
  )

  const clearFilters = useCallback(() => {
    setSearchParams(
      writeBoardFilters(searchParams, {
        q: '',
        assignee: 'all',
        due: 'all',
        priority: 'all',
      }),
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  return { filters, setFilters, clearFilters, active, searchParams, setSearchParams }
}
