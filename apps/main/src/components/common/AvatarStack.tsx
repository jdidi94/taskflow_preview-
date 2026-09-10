import { initials } from '@/components/workspace/normalizeMembers'
import { useI18n } from '@/i18n'

export type AvatarStackItem = {
  id: string
  name: string
  avatarUrl?: string | null
  /** Shown on hover / focus (e.g. role). */
  detail?: string
}

type AvatarStackProps = {
  items: AvatarStackItem[]
  max?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Accessible name for the stack (defaults to workspace members title). */
  label?: string
}

const sizeClass = {
  sm: 'h-7 w-7 text-[9px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-10 w-10 text-sm',
} as const

export function AvatarStack({
  items,
  max = 5,
  size = 'md',
  className = '',
  label,
}: AvatarStackProps) {
  const { t } = useI18n()
  const visible = items.slice(0, Math.max(1, max))
  const overflow = Math.max(0, items.length - visible.length)

  if (items.length === 0) return null

  return (
    <ul
      className={`flex items-center ps-1 ${className}`}
      aria-label={label ?? t('workspace.membersTitle')}
    >
      {visible.map((item, index) => {
        const label = item.detail ? `${item.name} · ${item.detail}` : item.name
        return (
          <li
            key={item.id}
            className="relative -ms-1.5 first:ms-0"
            style={{ zIndex: visible.length - index }}
          >
            <button
              type="button"
              title={label}
              aria-label={label}
              className={`group relative flex ${sizeClass[size]} items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted font-semibold text-muted-foreground outline-none transition hover:z-20 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
            >
              {item.avatarUrl ? (
                <img
                  src={item.avatarUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden>{initials(item.name)}</span>
              )}
              {item.detail ? (
                <span className="pointer-events-none absolute start-1/2 top-full z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/70 bg-background px-2 py-1 text-[10px] font-medium text-foreground opacity-0 shadow-md transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="text-foreground">{item.name}</span>
                  <span className="text-muted-foreground"> · {item.detail}</span>
                </span>
              ) : null}
            </button>
          </li>
        )
      })}
      {overflow > 0 ? (
        <li className="relative -ms-1.5" style={{ zIndex: 0 }}>
          <span
            className={`inline-flex ${sizeClass[size]} items-center justify-center rounded-full border-2 border-background bg-muted/80 font-semibold text-muted-foreground`}
            title={t('workspace.membersOverflow', { count: overflow })}
            aria-label={t('workspace.membersOverflow', { count: overflow })}
          >
            +{overflow}
          </span>
        </li>
      ) : null}
    </ul>
  )
}
