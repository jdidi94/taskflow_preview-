import { useMemo, useState } from 'react'
import { Loading } from '@taskflow/ui'
import {
  Activity,
  CalendarClock,
  FolderKanban,
  LayoutDashboard,
  Mail,
  BarChart3,
} from 'lucide-react'

import {
  ArchivedWorkspacesWidget,
  CreateWorkspaceModal,
  DashboardFirstRun,
  DashboardStats,
  RecentActivityWidget,
  UpcomingDeadlinesWidget,
  WelcomeHeader,
  WorkspacesSection,
} from '@/components/dashboard'
import { PageSubnav, PageSubnavPanel } from '@/components/common/PageSubnav'
import { PendingInvitesList } from '@/components/invites'
import { usePageTab } from '@/hooks/usePageTab'
import { useI18n } from '@/i18n'
import { useListPendingQuery } from '@/services/invitationsApi'
import { useListWorkspacesQuery } from '@/services/workspacesApi'
import { useAppSelector } from '@/store/hooks'

const DASH_TABS = [
  'overview',
  'stats',
  'workspaces',
  'deadlines',
  'invitations',
  'activity',
] as const

type DashTab = (typeof DASH_TABS)[number]

export function DashboardPage() {
  const { t } = useI18n()
  const user = useAppSelector((state) => state.auth.user)
  const { data, isLoading, isError, refetch } = useListWorkspacesQuery()
  const { data: pendingData } = useListPendingQuery()
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = usePageTab(DASH_TABS, 'overview')

  const workspaces = data?.data ?? []
  const pendingInviteCount = pendingData?.data?.length ?? 0
  const activeCount = workspaces.filter((w) => !w.archived && w.isActive !== false).length
  const spaceCount = workspaces.reduce((sum, w) => sum + (w.spaces?.length ?? 0), 0)
  const firstName = user?.name?.trim().split(/\s+/)[0]

  const subnavItems = useMemo(
    () => [
      { id: 'overview' as const, label: t('pageSubnav.overview'), icon: LayoutDashboard },
      { id: 'stats' as const, label: t('pageSubnav.stats'), icon: BarChart3 },
      { id: 'workspaces' as const, label: t('pageSubnav.workspaces'), icon: FolderKanban },
      { id: 'deadlines' as const, label: t('pageSubnav.deadlines'), icon: CalendarClock },
      { id: 'invitations' as const, label: t('pageSubnav.invitations'), icon: Mail },
      { id: 'activity' as const, label: t('pageSubnav.activity'), icon: Activity },
    ],
    [t],
  )

  if (isLoading && workspaces.length === 0) {
    return <Loading label={t('common.loading')} />
  }

  if (!isLoading && activeCount === 0) {
    return <DashboardFirstRun pendingInviteCount={pendingInviteCount} />
  }

  return (
    <div className="flex flex-col gap-6">
      <WelcomeHeader firstName={firstName} onCreateWorkspace={() => setModalOpen(true)} />

      <PageSubnav
        layoutId="dashboard-page-subnav"
        ariaLabel={t('pageSubnav.label')}
        items={subnavItems}
        value={tab}
        onChange={(next) => setTab(next as DashTab)}
      />

      <PageSubnavPanel id="overview" active={tab === 'overview'} className="flex flex-col gap-8">
        <DashboardStats
          workspaceCount={workspaces.length}
          activeCount={activeCount}
          spaceCount={spaceCount}
          pendingInviteCount={pendingInviteCount}
          isLoading={isLoading}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <UpcomingDeadlinesWidget />
          <RecentActivityWidget />
        </div>
        <WorkspacesSection
          workspaces={workspaces}
          isLoading={isLoading}
          isError={isError}
          onCreate={() => setModalOpen(true)}
        />
      </PageSubnavPanel>

      <PageSubnavPanel id="stats" active={tab === 'stats'}>
        <DashboardStats
          workspaceCount={workspaces.length}
          activeCount={activeCount}
          spaceCount={spaceCount}
          pendingInviteCount={pendingInviteCount}
          isLoading={isLoading}
        />
      </PageSubnavPanel>

      <PageSubnavPanel id="workspaces" active={tab === 'workspaces'} className="flex flex-col gap-8">
        <WorkspacesSection
          workspaces={workspaces}
          isLoading={isLoading}
          isError={isError}
          onCreate={() => setModalOpen(true)}
        />
        <ArchivedWorkspacesWidget workspaces={workspaces} isLoading={isLoading} />
      </PageSubnavPanel>

      <PageSubnavPanel id="deadlines" active={tab === 'deadlines'}>
        <UpcomingDeadlinesWidget />
      </PageSubnavPanel>

      <PageSubnavPanel id="invitations" active={tab === 'invitations'}>
        <PendingInvitesList />
      </PageSubnavPanel>

      <PageSubnavPanel id="activity" active={tab === 'activity'}>
        <RecentActivityWidget />
      </PageSubnavPanel>

      <CreateWorkspaceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => void refetch()}
      />
    </div>
  )
}
