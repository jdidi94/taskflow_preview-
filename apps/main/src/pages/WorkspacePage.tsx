import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { Loading } from '@taskflow/ui'
import {
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  Mail,
  ScrollText,
  Users,
} from 'lucide-react'

import { WorkspaceInviteForm } from '@/components/invites'
import { WorkspaceAnalyticsPanel } from '@/components/analytics/WorkspaceAnalyticsPanel'
import { PageSubnav, PageSubnavPanel } from '@/components/common/PageSubnav'
import {
  CreateSpaceModal,
  MembersSection,
  OwnerHintBanner,
  SpacesSection,
  WorkspaceHeader,
  WorkspaceSettingsPanel,
  normalizeWorkspaceMembers,
} from '@/components/workspace'
import { usePageTab } from '@/hooks/usePageTab'
import { useWorkspaceSocket } from '@/hooks/useWorkspaceSocket'
import { useI18n } from '@/i18n'
import { useListByWorkspaceQuery } from '@/services/spacesApi'
import {
  useGetWorkspaceQuery,
  useListWorkspaceMembersQuery,
} from '@/services/workspacesApi'
import { useAppSelector } from '@/store/hooks'

const WS_TABS = [
  'overview',
  'spaces',
  'members',
  'invites',
  'rules',
  'integrations',
] as const

type WsTab = (typeof WS_TABS)[number]

export function WorkspacePage() {
  const { t } = useI18n()
  const { workspaceId = '' } = useParams()
  useWorkspaceSocket(workspaceId || undefined)
  const currentUserId = useAppSelector((state) => state.auth.user?.id)
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = usePageTab(WS_TABS, 'overview')

  const { data: workspaceData, isLoading: workspaceLoading } = useGetWorkspaceQuery(workspaceId, {
    skip: !workspaceId,
  })
  const {
    data: spacesData,
    isLoading: spacesLoading,
    isError: spacesError,
    refetch: refetchSpaces,
  } = useListByWorkspaceQuery(workspaceId, { skip: !workspaceId })
  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
  } = useListWorkspaceMembersQuery(workspaceId, { skip: !workspaceId })

  const workspace = workspaceData?.data
  const spaces = spacesData?.data ?? []
  const members = useMemo(
    () => normalizeWorkspaceMembers(membersData?.data),
    [membersData?.data],
  )

  const canManageMembers = useMemo(() => {
    if (!currentUserId) return false
    return members.some(
      (m) => m.id === currentUserId && (m.isOwner || m.role === 'admin' || m.role === 'owner'),
    )
  }, [members, currentUserId])

  const showOwnerHint = useMemo(() => {
    const admins = members.filter((m) => m.role === 'admin' || m.isOwner)
    return members.length > 0 && admins.length <= 1
  }, [members])

  const subnavItems = useMemo(
    () => [
      { id: 'overview' as const, label: t('pageSubnav.overview'), icon: LayoutDashboard },
      { id: 'spaces' as const, label: t('pageSubnav.spaces'), icon: FolderKanban },
      { id: 'members' as const, label: t('pageSubnav.members'), icon: Users },
      { id: 'invites' as const, label: t('pageSubnav.invites'), icon: Mail },
      { id: 'rules' as const, label: t('pageSubnav.rules'), icon: ScrollText },
      { id: 'integrations' as const, label: t('pageSubnav.integrations'), icon: GitBranch },
    ],
    [t],
  )

  // If URL lands on invites without manage rights, fall back to overview.
  const activeTab: WsTab =
    tab === 'invites' && !canManageMembers ? 'overview' : tab

  if ((workspaceLoading || spacesLoading) && !workspace) {
    return <Loading label={t('common.loading')} />
  }

  return (
    <div className="flex flex-col gap-6">
      <WorkspaceHeader workspace={workspace} onCreateSpace={() => setModalOpen(true)} />

      <PageSubnav
        layoutId="workspace-page-subnav"
        ariaLabel={t('pageSubnav.label')}
        items={
          canManageMembers ? subnavItems : subnavItems.filter((item) => item.id !== 'invites')
        }
        value={activeTab}
        onChange={(next) => setTab(next as WsTab)}
      />

      <PageSubnavPanel id="overview" active={activeTab === 'overview'} className="flex flex-col gap-8">
        <OwnerHintBanner show={showOwnerHint} />
        <SpacesSection
          spaces={spaces}
          workspaceId={workspaceId}
          isLoading={spacesLoading}
          isError={spacesError}
          onCreate={() => setModalOpen(true)}
        />
        {workspaceId ? <WorkspaceAnalyticsPanel workspaceId={workspaceId} /> : null}
        {workspace ? (
          <WorkspaceSettingsPanel
            workspace={workspace}
            members={members}
            canManage={canManageMembers}
            sections="general"
          />
        ) : null}
      </PageSubnavPanel>

      <PageSubnavPanel id="spaces" active={activeTab === 'spaces'}>
        <SpacesSection
          spaces={spaces}
          workspaceId={workspaceId}
          isLoading={spacesLoading}
          isError={spacesError}
          onCreate={() => setModalOpen(true)}
        />
      </PageSubnavPanel>

      <PageSubnavPanel id="members" active={activeTab === 'members'}>
        <MembersSection
          workspaceId={workspaceId}
          members={members}
          currentUserId={currentUserId}
          canManage={canManageMembers}
          isLoading={membersLoading}
          isError={membersError}
        />
      </PageSubnavPanel>

      <PageSubnavPanel id="invites" active={activeTab === 'invites'}>
        {workspaceId && canManageMembers ? (
          <WorkspaceInviteForm workspaceId={workspaceId} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('pageSubnav.invitesRestricted')}</p>
        )}
      </PageSubnavPanel>

      <PageSubnavPanel id="rules" active={activeTab === 'rules'}>
        {workspace ? (
          <WorkspaceSettingsPanel
            workspace={workspace}
            members={members}
            canManage={canManageMembers}
            sections="rules"
          />
        ) : null}
      </PageSubnavPanel>

      <PageSubnavPanel id="integrations" active={activeTab === 'integrations'}>
        {workspace ? (
          <WorkspaceSettingsPanel
            workspace={workspace}
            members={members}
            canManage={canManageMembers}
            sections="integrations"
          />
        ) : null}
      </PageSubnavPanel>

      {workspaceId ? (
        <CreateSpaceModal
          open={modalOpen}
          workspaceId={workspaceId}
          onClose={() => setModalOpen(false)}
          onCreated={() => void refetchSpaces()}
        />
      ) : null}
    </div>
  )
}
