import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { Loading } from '@taskflow/ui'
import { Grid3X3, LayoutDashboard, Settings2, Users } from 'lucide-react'

import { SpaceAnalyticsPanel } from '@/components/analytics/SpaceAnalyticsPanel'
import { PageSubnav, PageSubnavPanel } from '@/components/common/PageSubnav'
import {
  BoardsSection,
  CreateBoardModal,
  SpaceHeader,
  SpaceSettingsPanel,
  SpaceStats,
} from '@/components/space'
import { normalizeSpaceMembers } from '@/components/space/normalizeSpaceMembers'
import { normalizeWorkspaceMembers } from '@/components/workspace/normalizeMembers'
import { usePageTab } from '@/hooks/usePageTab'
import { useWorkspaceSocket } from '@/hooks/useWorkspaceSocket'
import { useI18n } from '@/i18n'
import { useListBySpaceQuery } from '@/services/boardsApi'
import {
  useGetSpaceQuery,
  useListSpaceMembersQuery,
} from '@/services/spacesApi'
import {
  useGetWorkspaceQuery,
  useListWorkspaceMembersQuery,
} from '@/services/workspacesApi'
import { useAppSelector } from '@/store/hooks'

const SPACE_TABS = ['overview', 'boards', 'members', 'settings'] as const
type SpaceTab = (typeof SPACE_TABS)[number]

export function SpacePage() {
  const { t } = useI18n()
  const { spaceId = '' } = useParams()
  const currentUserId = useAppSelector((state) => state.auth.user?.id)
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = usePageTab(SPACE_TABS, 'overview')

  const { data: spaceData, isLoading: spaceLoading } = useGetSpaceQuery(spaceId, { skip: !spaceId })
  const space = spaceData?.data
  const workspaceId = space ? String(space.workspace) : undefined
  useWorkspaceSocket(workspaceId)

  const { data: workspaceData } = useGetWorkspaceQuery(workspaceId ?? '', {
    skip: !workspaceId,
  })
  const { data: workspaceMembersData } = useListWorkspaceMembersQuery(workspaceId ?? '', {
    skip: !workspaceId,
  })
  const {
    data: spaceMembersData,
    isLoading: spaceMembersLoading,
  } = useListSpaceMembersQuery(spaceId, { skip: !spaceId })

  const {
    data: boardsData,
    isLoading: boardsLoading,
    isError: boardsError,
    refetch,
  } = useListBySpaceQuery(spaceId, { skip: !spaceId })

  const boards = boardsData?.data ?? []
  const spaceMembers = useMemo(
    () => normalizeSpaceMembers(spaceMembersData?.data),
    [spaceMembersData?.data],
  )
  const workspaceMembers = useMemo(
    () => normalizeWorkspaceMembers(workspaceMembersData?.data),
    [workspaceMembersData?.data],
  )

  const canManageSpace = useMemo(() => {
    if (!currentUserId) return false
    return spaceMembers.some((m) => m.id === currentUserId && m.role === 'admin')
  }, [spaceMembers, currentUserId])

  const activeCount = useMemo(
    () => boards.filter((b) => !b.archived && b.isActive !== false).length,
    [boards],
  )
  const columnCount = useMemo(
    () => boards.reduce((sum, b) => sum + (b.columns?.length ?? 0), 0),
    [boards],
  )
  const memberCount = spaceMembers.length || (space?.members?.length ?? 0)

  const subnavItems = useMemo(
    () => [
      { id: 'overview' as const, label: t('pageSubnav.overview'), icon: LayoutDashboard },
      { id: 'boards' as const, label: t('pageSubnav.boards'), icon: Grid3X3 },
      { id: 'members' as const, label: t('pageSubnav.members'), icon: Users },
      { id: 'settings' as const, label: t('pageSubnav.settings'), icon: Settings2 },
    ],
    [t],
  )

  if ((spaceLoading || boardsLoading) && !space) {
    return <Loading label={t('common.loading')} />
  }

  return (
    <div className="flex flex-col gap-6">
      <SpaceHeader
        space={space}
        workspaceId={workspaceId}
        workspaceName={workspaceData?.data?.name}
        onCreateBoard={() => setModalOpen(true)}
      />

      <PageSubnav
        layoutId="space-page-subnav"
        ariaLabel={t('pageSubnav.label')}
        items={subnavItems}
        value={tab}
        onChange={(next) => setTab(next as SpaceTab)}
      />

      <PageSubnavPanel id="overview" active={tab === 'overview'} className="flex flex-col gap-8">
        <SpaceStats
          boardCount={boards.length}
          activeCount={activeCount}
          memberCount={memberCount}
          columnCount={columnCount}
          isLoading={boardsLoading}
        />
        {spaceId ? <SpaceAnalyticsPanel spaceId={spaceId} /> : null}
        <BoardsSection
          boards={boards}
          spaceId={spaceId}
          isLoading={boardsLoading}
          isError={boardsError}
          onCreate={() => setModalOpen(true)}
        />
      </PageSubnavPanel>

      <PageSubnavPanel id="boards" active={tab === 'boards'}>
        <BoardsSection
          boards={boards}
          spaceId={spaceId}
          isLoading={boardsLoading}
          isError={boardsError}
          onCreate={() => setModalOpen(true)}
        />
      </PageSubnavPanel>

      <PageSubnavPanel id="members" active={tab === 'members'}>
        {space && workspaceId ? (
          <SpaceSettingsPanel
            space={space}
            workspaceId={workspaceId}
            spaceMembers={spaceMembers}
            workspaceMembers={workspaceMembers}
            currentUserId={currentUserId}
            canManage={canManageSpace}
            membersLoading={spaceMembersLoading}
            sections="members"
          />
        ) : null}
      </PageSubnavPanel>

      <PageSubnavPanel id="settings" active={tab === 'settings'}>
        {space && workspaceId ? (
          <SpaceSettingsPanel
            space={space}
            workspaceId={workspaceId}
            spaceMembers={spaceMembers}
            workspaceMembers={workspaceMembers}
            currentUserId={currentUserId}
            canManage={canManageSpace}
            membersLoading={spaceMembersLoading}
            sections="general"
          />
        ) : null}
      </PageSubnavPanel>

      {spaceId ? (
        <CreateBoardModal
          open={modalOpen}
          spaceId={spaceId}
          onClose={() => setModalOpen(false)}
          onCreated={() => void refetch()}
        />
      ) : null}
    </div>
  )
}
