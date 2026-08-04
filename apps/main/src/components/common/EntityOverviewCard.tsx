import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'

import { AvatarStack, type AvatarStackItem } from '@/components/common/AvatarStack'
import { entityCoverGradient } from '@/components/common/entityCover'
import { useI18n } from '@/i18n'

type EntityOverviewCardProps = {
  to: string
  title: string
  description?: string | null
  /** Small meta chips under the description (counts, dates). */
  meta?: ReactNode
  avatars?: AvatarStackItem[]
  avatarLabel?: string
  /** Shown on the cover (e.g. board type icon). */
  icon?: LucideIcon
  badge?: ReactNode
  /** Absolute corner actions (archive menu) — not inside the link. */
  menu?: ReactNode
  /** Cover seed; defaults to `to` + title. */
  coverSeed?: string
  className?: string
  ctaLabel?: string
}

export function EntityOverviewCard({
  to,
  title,
  description,
  meta,
  avatars,
  avatarLabel,
  icon: Icon,
  badge,
  menu,
  coverSeed,
  className = '',
  ctaLabel,
}: EntityOverviewCardProps) {
  const { t } = useI18n()
  const cover = entityCoverGradient(coverSeed ?? `${to}:${title}`)
  const openLabel = ctaLabel ?? t('pageSubnav.open')

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition hover:border-primary/40 hover:shadow-sm ${className}`}
    >
      <Link to={to} className="flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <div className={`relative h-24 shrink-0 bg-gradient-to-br ${cover}`}>
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,hsl(var(--primary-foreground)_/_0.14),transparent_55%)]"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/30 to-transparent"
            aria-hidden
          />
          <div className="relative flex h-full items-start justify-between gap-2 p-3">
            {Icon ? (
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-background/20 text-primary-foreground backdrop-blur-sm">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            ) : (
              <span className="size-9" aria-hidden />
            )}
            {badge ? <div className="max-w-[50%] shrink-0">{badge}</div> : null}
          </div>
        </div>

        <div className={`flex flex-1 flex-col gap-2 p-4`}>
          <h3 className="truncate font-display text-base font-semibold leading-snug tracking-tight group-hover:text-primary">
            {title}
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {description?.trim() || t('pageSubnav.noDescription')}
          </p>
          {meta ? (
            <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
              {meta}
            </div>
          ) : null}
          {avatars && avatars.length > 0 ? (
            <div className="pt-1">
              <AvatarStack items={avatars} max={4} size="sm" label={avatarLabel} />
            </div>
          ) : null}
          <span className="mt-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
            {openLabel}
          </span>
        </div>
      </Link>

      {menu ? (
        <div className="absolute end-2 top-2 z-10 rounded-md bg-background/85 p-0.5 shadow-sm backdrop-blur-sm">
          {menu}
        </div>
      ) : null}
    </div>
  )
}
