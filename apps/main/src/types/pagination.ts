/** Canonical list pagination meta (page-based directories). */
export type ListPagination = {
  page: number
  limit: number
  totalItems: number
  pages: number
  hasMore: boolean
}

export function normalizeListPagination(raw: {
  page?: number
  currentPage?: number
  limit?: number
  totalItems?: number
  total?: number
  pages?: number
}): ListPagination {
  const page = Math.max(1, Number(raw.page ?? raw.currentPage ?? 1) || 1)
  const limit = Math.max(1, Number(raw.limit ?? 20) || 20)
  const totalItems = Math.max(0, Number(raw.totalItems ?? raw.total ?? 0) || 0)
  const pages = Math.max(1, Number(raw.pages) || Math.max(1, Math.ceil(totalItems / limit) || 1))
  return {
    page: Math.min(page, pages),
    limit,
    totalItems,
    pages,
    hasMore: page < pages,
  }
}

export function paginateSlice<T>(items: readonly T[], page: number, limit: number): {
  items: T[]
  pagination: ListPagination
} {
  const totalItems = items.length
  const pages = Math.max(1, Math.ceil(totalItems / limit) || 1)
  const safePage = Math.min(Math.max(1, page), pages)
  const start = (safePage - 1) * limit
  return {
    items: items.slice(start, start + limit) as T[],
    pagination: {
      page: safePage,
      limit,
      totalItems,
      pages,
      hasMore: safePage < pages,
    },
  }
}
