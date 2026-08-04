import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Syncs a page subnav selection to `?tab=` (omitted when value === defaultTab).
 */
export function usePageTab<T extends string>(
  tabs: readonly T[],
  defaultTab: T,
  paramKey = 'tab',
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = useMemo(() => {
    const raw = searchParams.get(paramKey)
    if (raw && (tabs as readonly string[]).includes(raw)) return raw as T
    return defaultTab
  }, [searchParams, paramKey, tabs, defaultTab])

  const setTab = useCallback(
    (next: T) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === defaultTab) params.delete(paramKey)
          else params.set(paramKey, next)
          return params
        },
        { replace: true },
      )
    },
    [defaultTab, paramKey, setSearchParams],
  )

  return [tab, setTab]
}
