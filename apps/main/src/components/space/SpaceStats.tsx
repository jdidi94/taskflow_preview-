import { Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'
import { Columns3, LayoutGrid, Users, CheckCircle2 } from 'lucide-react'

import { useI18n } from '@/i18n'

type SpaceStatsProps = {
  boardCount: number
  activeCount: number
  memberCount: number
  columnCount: number
  isLoading?: boolean
}

const cardClass =
  'border-border/70 transition-shadow hover:border-primary/30 hover:shadow-sm'

export function SpaceStats({
  boardCount,
  activeCount,
  memberCount,
  columnCount,
  isLoading,
}: SpaceStatsProps) {
  const { t } = useI18n()

  const items = [
    {
      key: 'boards',
      label: t('space.statBoards'),
      value: boardCount,
      hint: t('space.statBoardsHint'),
      icon: LayoutGrid,
    },
    {
      key: 'active',
      label: t('space.statActive'),
      value: activeCount,
      hint: t('space.statActiveHint'),
      icon: CheckCircle2,
    },
    {
      key: 'columns',
      label: t('space.statColumns'),
      value: columnCount,
      hint: t('space.statColumnsHint'),
      icon: Columns3,
    },
    {
      key: 'members',
      label: t('space.statMembers'),
      value: memberCount,
      hint: t('space.statMembersHint'),
      icon: Users,
    },
  ] as const

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Card key={item.key} className={`${cardClass} animate-pulse`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="h-3 w-3 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="mb-2 h-6 w-10 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ key, label, value, hint, icon: Icon }) => (
        <Card key={key} className={cardClass}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
