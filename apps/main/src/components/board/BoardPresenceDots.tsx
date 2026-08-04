import { initials } from '@/components/workspace/normalizeMembers'
import type { BoardPresenceUser, PresenceStatus } from '@/hooks/useBoardPresence'
import { useI18n } from '@/i18n'

const STATUS_DOT: Record<PresenceStatus, string> = {
  online: 'bg-success',
  active: 'bg-success',
  away: 'bg-warning',
  busy: 'bg-destructive',
  offline: 'bg-muted-foreground/50',
}

const STATUS_KEY = {
  online: 'board.presenceOnline',
  active: 'board.presenceOnline',
  away: 'board.presenceAway',
  busy: 'board.presenceBusy',
  offline: 'board.presenceOffline',
} as const

type BoardPresenceDotsProps = {
  users: BoardPresenceUser[]
  max?: number
  className?: string
}

/** Avatar stack with status dots — only meaningful when board socket presence is live. */
export function BoardPresenceDots({ users, max = 5, className = '' }: BoardPresenceDotsProps) {
  const { t } = useI18n()
  const visible = users.filter((user) => user.status !== 'offline').slice(0, Math.max(1, max))
  const overflow = Math.max(0, users.length - visible.length)

  if (visible.length === 0) return null

  return (
    <ul
      className={`flex items-center ps-1 ${className}`}
      aria-label={t('board.presenceLabel', { count: users.length })}
    >
      {visible.map((user, index) => {
        const statusLabel = t(STATUS_KEY[user.status])
        const label = `${user.name} · ${statusLabel}`
        return (
          <li
            key={user.id}
            className="relative -ms-1.5 first:ms-0"
            style={{ zIndex: visible.length - index }}
          >
            <span
              title={label}
              aria-label={label}
              className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>{initials(user.name)}</span>
              )}
              <span
                className={`absolute bottom-0 end-0 size-2.5 rounded-full ring-2 ring-background ${STATUS_DOT[user.status]}`}
                aria-hidden
              />
            </span>
          </li>
        )
      })}
      {overflow > 0 ? (
        <li className="relative -ms-1.5" style={{ zIndex: 0 }}>
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted/80 text-[10px] font-semibold text-muted-foreground"
            title={t('board.presenceMore', { count: overflow })}
            aria-label={t('board.presenceMore', { count: overflow })}
          >
            +{overflow}
          </span>
        </li>
      ) : null}
    </ul>
  )
}
