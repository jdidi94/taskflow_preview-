import { Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'
import { Building2, FolderKanban, Layers, Mail } from 'lucide-react'

import { useI18n } from '@/i18n'

type DashboardStatsProps = {
  workspaceCount: number
  activeCount: number
  spaceCount: number
  pendingInviteCount: number
  isLoading?: boolean
}

const cardClass =
  'border-border/70 transition-shadow hover:border-primary/30 hover:shadow-sm'

export function DashboardStats({
  workspaceCount,
  activeCount,
  spaceCount,
  pendingInviteCount,
  isLoading,
}: DashboardStatsProps) {
  const { t } = useI18n()

  const items = [
    {
      key: 'workspaces',
      label: t('dashboard.statWorkspaces'),
      value: workspaceCount,
      hint: t('dashboard.statWorkspacesHint'),
      icon: Building2,
    },
    {
      key: 'active',
      label: t('dashboard.statActive'),
      value: activeCount,
      hint: t('dashboard.statActiveHint'),
      icon: FolderKanban,
    },
    {
      key: 'spaces',
      label: t('dashboard.statSpaces'),
      value: spaceCount,
      hint: t('dashboard.statSpacesHint'),
      icon: Layers,
    },
    {
      key: 'invites',
      label: t('dashboard.statInvites'),
      value: pendingInviteCount,
      hint: t('dashboard.statInvitesHint'),
      icon: Mail,
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
