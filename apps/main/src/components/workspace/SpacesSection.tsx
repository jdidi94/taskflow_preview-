import { useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'
import { Archive, Layers, Plus } from 'lucide-react'

import { ArchiveConfirmModal } from '@/components/common/ArchiveConfirmModal'
import { ArchivedEntityRow, EntityActionMenu } from '@/components/common/ArchivedEntityRow'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityOverviewCard } from '@/components/common/EntityOverviewCard'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useArchiveSpaceMutation, useRestoreSpaceMutation } from '@/services/spacesApi'
import type { Space } from '@/types/domain'

type SpacesSectionProps = {
  spaces: Space[]
  workspaceId: string
  isLoading?: boolean
  isError?: boolean
  onCreate: () => void
}

function isArchived(space: Space) {
  return Boolean(space.archived) || space.isActive === false
}

export function SpacesSection({
  spaces,
  workspaceId,
  isLoading,
  isError,
  onCreate,
}: SpacesSectionProps) {
  const { t } = useI18n()
  const [archiveSpace, { isLoading: archiving }] = useArchiveSpaceMutation()
  const [restoreSpace, { isLoading: restoring }] = useRestoreSpaceMutation()
  const [pending, setPending] = useState<{ space: Space; mode: 'archive' | 'restore' } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const active = spaces.filter((s) => !isArchived(s))
  const archived = spaces.filter((s) => isArchived(s))
  const { pageItems, pagination, setPage, setLimit } = useClientPagination(active, 12)

  function openAction(space: Space, mode: 'archive' | 'restore') {
    setActionError(null)
    setPending({ space, mode })
  }

  async function confirmAction() {
    if (!pending) return
    setActionError(null)
    try {
      if (pending.mode === 'archive') {
        await archiveSpace({ id: pending.space.id, workspaceId }).unwrap()
      } else {
        await restoreSpace({ id: pending.space.id, workspaceId }).unwrap()
      }
      setPending(null)
    } catch (err) {
      setActionError(getApiErrorMessage(err, t('archive.errorTitle')))
    }
  }

  function renderActiveCard(space: Space) {
    const boardCount = space.boards?.length ?? 0
    const memberCount = space.members?.length ?? 0

    return (
      <EntityOverviewCard
        key={space.id}
        to={`/spaces/${space.id}`}
        title={space.name}
        description={space.description}
        coverSeed={space.id}
        icon={Layers}
        meta={
          <>
            <span>{t('workspace.boardCount', { count: boardCount })}</span>
            <span aria-hidden>·</span>
            <span>{t('workspace.memberCount', { count: memberCount })}</span>
          </>
        }
        menu={
          <EntityActionMenu
            items={[
              {
                id: 'archive',
                label: t('archive.archive'),
                icon: Archive,
                onSelect: () => openAction(space, 'archive'),
              },
            ]}
          />
        }
      />
    )
  }

  return (
    <>
      <Card className="border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{t('workspace.spacesTitle')}</CardTitle>
              <Badge variant="secondary">{active.length}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={onCreate} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t('workspace.newSpace')}
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

          {isError ? <p className="text-sm text-destructive">{t('workspace.spacesLoadError')}</p> : null}

          {!isLoading && !isError && active.length === 0 ? (
            <EmptyState
              compact
              icon={Layers}
              title={t('workspace.spacesEmptyTitle')}
              description={t('workspace.spacesEmpty')}
              action={
                <Button variant="primary" size="sm" onClick={onCreate} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {t('workspace.newSpace')}
                </Button>
              }
            />
          ) : null}

          {!isLoading && !isError && active.length > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pageItems.map(renderActiveCard)}
              </div>
              <PaginationBar
                className="mt-4"
                pagination={pagination}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </>
          ) : null}

          {!isLoading && !isError && archived.length > 0 ? (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {t('archive.archivedSection')}
              </h3>
              <div className="flex flex-col gap-2">
                {archived.map((space) => (
                  <ArchivedEntityRow
                    key={space.id}
                    title={space.name}
                    description={space.description?.trim() || t('workspace.noDescription')}
                    to={`/spaces/${space.id}`}
                    onRestore={() => openAction(space, 'restore')}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ArchiveConfirmModal
        open={Boolean(pending)}
        mode={pending?.mode ?? 'archive'}
        entityLabel={t('archive.entitySpace')}
        name={pending?.space.name ?? ''}
        busy={archiving || restoring}
        error={actionError}
        onClose={() => {
          if (archiving || restoring) return
          setPending(null)
          setActionError(null)
        }}
        onConfirm={confirmAction}
      />
    </>
  )
}
