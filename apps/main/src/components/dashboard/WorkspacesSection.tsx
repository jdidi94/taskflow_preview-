import { useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'
import { Archive, FolderKanban, Plus } from 'lucide-react'

import { ArchiveConfirmModal } from '@/components/common/ArchiveConfirmModal'
import { EntityActionMenu } from '@/components/common/ArchivedEntityRow'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityOverviewCard } from '@/components/common/EntityOverviewCard'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useArchiveWorkspaceMutation } from '@/services/workspacesApi'
import type { Workspace } from '@/types/domain'

type WorkspacesSectionProps = {
  workspaces: Workspace[]
  isLoading?: boolean
  isError?: boolean
  onCreate: () => void
}

function isArchived(workspace: Workspace) {
  return Boolean(workspace.archived) || workspace.isActive === false
}

export function WorkspacesSection({
  workspaces,
  isLoading,
  isError,
  onCreate,
}: WorkspacesSectionProps) {
  const { t } = useI18n()
  const [archiveWorkspace, { isLoading: archiving }] = useArchiveWorkspaceMutation()
  const [pending, setPending] = useState<Workspace | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const active = workspaces.filter((w) => !isArchived(w))
  const { pageItems, pagination, setPage, setLimit } = useClientPagination(active, 12)

  function openArchive(workspace: Workspace) {
    setActionError(null)
    setPending(workspace)
  }

  async function confirmArchive() {
    if (!pending) return
    setActionError(null)
    try {
      await archiveWorkspace(pending.id).unwrap()
      setPending(null)
    } catch (err) {
      setActionError(getApiErrorMessage(err, t('archive.errorTitle')))
    }
  }

  return (
    <>
      <Card className="border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{t('dashboard.workspacesTitle')}</CardTitle>
              <Badge variant="secondary">{active.length}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={onCreate} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t('dashboard.newWorkspace')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-lg border border-border/60 bg-muted/40"
                />
              ))}
            </div>
          ) : null}

          {isError ? (
            <p className="text-sm text-destructive">{t('dashboard.loadError')}</p>
          ) : null}

          {!isLoading && !isError && active.length === 0 ? (
            <EmptyState
              compact
              icon={FolderKanban}
              title={t('dashboard.emptyTitle')}
              description={t('dashboard.empty')}
              action={
                <Button variant="primary" size="sm" onClick={onCreate} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {t('dashboard.newWorkspace')}
                </Button>
              }
            />
          ) : null}

          {!isLoading && !isError && active.length > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pageItems.map((workspace) => {
                  const memberCount = workspace.members?.length ?? 0
                  const spaceCount = workspace.spaces?.length ?? 0
                  return (
                    <EntityOverviewCard
                      key={workspace.id}
                      to={`/workspaces/${workspace.id}`}
                      title={workspace.name}
                      description={workspace.description}
                      coverSeed={workspace.id}
                      icon={FolderKanban}
                      meta={
                        <>
                          <span>{t('dashboard.memberCount', { count: memberCount })}</span>
                          <span aria-hidden>·</span>
                          <span>{t('dashboard.spaceCount', { count: spaceCount })}</span>
                          {workspace.createdAt ? (
                            <>
                              <span aria-hidden>·</span>
                              <span>
                                {t('dashboard.created', {
                                  date: new Date(workspace.createdAt).toLocaleDateString(),
                                })}
                              </span>
                            </>
                          ) : null}
                        </>
                      }
                      menu={
                        <EntityActionMenu
                          items={[
                            {
                              id: 'archive',
                              label: t('archive.archive'),
                              icon: Archive,
                              onSelect: () => openArchive(workspace),
                            },
                          ]}
                        />
                      }
                    />
                  )
                })}
              </div>
              <PaginationBar
                className="mt-4"
                pagination={pagination}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      <ArchiveConfirmModal
        open={Boolean(pending)}
        mode="archive"
        entityLabel={t('archive.entityWorkspace')}
        name={pending?.name ?? ''}
        busy={archiving}
        error={actionError}
        onClose={() => {
          if (archiving) return
          setPending(null)
          setActionError(null)
        }}
        onConfirm={confirmArchive}
      />
    </>
  )
}
