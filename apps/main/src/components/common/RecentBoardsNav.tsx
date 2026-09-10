import { NavLink } from 'react-router'
import { LayoutGrid } from 'lucide-react'

import { useRecentBoards } from '@/hooks/useRecentBoards'
import { useI18n } from '@/i18n'
import { focusRingClassName } from '@/lib/focusRing'

type Props = {
  iconOnly?: boolean
  onNavigate?: () => void
}

export function RecentBoardsNav({ iconOnly, onNavigate }: Props) {
  const { t } = useI18n()
  const boards = useRecentBoards()

  if (boards.length === 0) return null

  return (
    <div className={iconOnly ? 'mt-2' : 'mt-3'}>
      {!iconOnly ? (
        <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {t('nav.recentBoards')}
        </p>
      ) : (
        <span className="sr-only">{t('nav.recentBoards')}</span>
      )}
      <div className="flex flex-col gap-0.5">
        {boards.map((board) => {
          const hint = [board.workspaceName, board.spaceName].filter(Boolean).join(' · ')
          return (
            <NavLink
              key={board.id}
              to={`/boards/${board.id}`}
              title={iconOnly ? board.name : hint || undefined}
              aria-label={iconOnly ? board.name : undefined}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center rounded-md text-sm transition-colors ${focusRingClassName} ${
                  iconOnly ? 'justify-center px-0 py-2' : 'gap-2 py-1.5 pe-2.5 ps-3'
                } ${
                  isActive
                    ? 'bg-muted font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`
              }
            >
              <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
              {!iconOnly ? (
                <span className="min-w-0 flex-1 truncate">
                  {board.name}
                  {hint ? (
                    <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
                      {hint}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
