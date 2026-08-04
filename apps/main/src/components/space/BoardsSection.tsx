import { useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'
import { Archive, Calendar, Columns3, Grid3X3, List, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { ArchiveConfirmModal } from '@/components/common/ArchiveConfirmModal'
import { ArchivedEntityRow, EntityActionMenu } from '@/components/common/ArchivedEntityRow'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityOverviewCard } from '@/components/common/EntityOverviewCard'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useArchiveBoardMutation, useRestoreBoardMutation } from '@/services/boardsApi'
import type { Board } from '@/types/domain'

type BoardsSectionProps = {
  boards: Board[]
  spaceId: string
  isLoading?: boolean
  isError?: boolean
  onCreate: () => void
}

function isArchived(board: Board) {
  return Boolean(board.archived) || board.isActive === false
}

function boardTypeIcon(type: Board['type']): LucideIcon {
  switch (type) {
    case 'list':
      return List
    case 'calendar':
      return Calendar
    case 'timeline':
      return Columns3
    default:
      return Grid3X3
  }
}

export function BoardsSection({
  boards,
  spaceId,
  isLoading,
  isError,
  onCreate,
}: BoardsSectionProps) {
  const { t } = useI18n()
  const [archiveBoard, { isLoading: archiving }] = useArchiveBoardMutation()
  const [restoreBoard, { isLoading: restoring }] = useRestoreBoardMutation()
  const [pending, setPending] = useState<{ board: Board; mode: 'archive' | 'restore' } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const active = boards.filter((b) => !isArchived(b))
  const archived = boards.filter((b) => isArchived(b))
  const { pageItems, pagination, setPage, setLimit } = useClientPagination(active, 12)

  function openAction(board: Board, mode: 'archive' | 'restore') {
    setActionError(null)
    setPending({ board, mode })
  }

  async function confirmAction() {
    if (!pending) return
    setActionError(null)
    try {
      if (pending.mode === 'archive') {
        await archiveBoard({ id: pending.board.id, spaceId }).unwrap()
      } else {
        await restoreBoard({ id: pending.board.id, spaceId }).unwrap()
      }
      setPending(null)
    } catch (err) {
      setActionError(getApiErrorMessage(err, t('archive.errorTitle')))
    }
  }

  function renderActiveCard(board: Board) {
    const type = board.type ?? 'kanban'
    const Icon = boardTypeIcon(type)
    const columnCount = board.columns?.length ?? 0
    const memberCount = board.members?.length ?? 0

    return (
      <EntityOverviewCard
        key={board.id}
        to={`/boards/${board.id}`}
        title={board.name}
        description={board.description || t('space.boardFallbackDesc')}
        coverSeed={board.id}
        icon={Icon}
        badge={
          <Badge variant="secondary" className="border-0 bg-background/85 text-[10px] text-foreground shadow-sm">
            {type}
          </Badge>
        }
        meta={
          <>
            <span>{t('space.columnCount', { count: columnCount })}</span>
            <span aria-hidden>·</span>
            <span>{t('space.memberCount', { count: memberCount })}</span>
          </>
        }
        menu={
          <EntityActionMenu
            items={[
              {
                id: 'archive',
                label: t('archive.archive'),
                icon: Archive,
                onSelect: () => openAction(board, 'archive'),
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
              <CardTitle className="text-base">{t('space.boardsTitle')}</CardTitle>
              <Badge variant="secondary">{active.length}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={onCreate} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t('space.newBoard')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-lg border border-border/60 bg-muted/40"
                />
              ))}
            </div>
          ) : null}

          {isError ? <p className="text-sm text-destructive">{t('space.boardsLoadError')}</p> : null}

          {!isLoading && !isError && active.length === 0 ? (
            <EmptyState
              compact
              icon={Grid3X3}
              title={t('space.boardsEmptyTitle')}
              description={t('space.boardsEmpty')}
              action={
                <Button variant="primary" size="sm" onClick={onCreate}>
                  {t('space.newBoard')}
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
                {archived.map((board) => (
                  <ArchivedEntityRow
                    key={board.id}
                    title={board.name}
                    description={board.description?.trim() || t('space.boardFallbackDesc')}
                    to={`/boards/${board.id}`}
                    onRestore={() => openAction(board, 'restore')}
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
        entityLabel={t('archive.entityBoard')}
        name={pending?.board.name ?? ''}
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
