import { Link } from 'react-router'

import { useI18n } from '@/i18n'

export type PageCrumb = {
  label: string
  to?: string
}

/** Local wrapper — labels come from callers via i18n; layout respects document dir. */
export function PageBreadcrumbs({ items }: { items: PageCrumb[] }) {
  const { t } = useI18n()

  return (
    <nav aria-label={t('common.breadcrumb')} className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden>/</span> : null}
            {item.to && !isLast ? (
              <Link to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-foreground' : undefined}>{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
