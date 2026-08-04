import { useEffect, useMemo, useState } from 'react'

import { paginateSlice, type ListPagination } from '@/types/pagination'

const DEFAULT_LIMIT = 12

/**
 * Client-side page/limit over an in-memory list (until the API supports server paging).
 */
export function useClientPagination<T>(items: readonly T[], defaultLimit = DEFAULT_LIMIT) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(defaultLimit)

  const { items: pageItems, pagination } = useMemo(
    () => paginateSlice(items, page, limit),
    [items, page, limit],
  )

  useEffect(() => {
    if (pagination.page !== page) setPage(pagination.page)
  }, [pagination.page, page])

  function onLimitChange(next: number) {
    setLimit(next)
    setPage(1)
  }

  return {
    pageItems,
    pagination: pagination as ListPagination,
    page: pagination.page,
    limit,
    setPage,
    setLimit: onLimitChange,
  }
}
