import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button } from '@taskflow/ui'
import { Archive, Bot, Columns3, Plus, RotateCcw } from 'lucide-react'

import { ArchiveConfirmModal } from '@/components/common/ArchiveConfirmModal'
import { BoardPresenceDots } from '@/components/board/BoardPresenceDots'
import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { useBoardPresence } from '@/hooks/useBoardPresence'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useArchiveBoardMutation, useRestoreBoardMutation } from '@/services/boardsApi'
import type { Board } from '@/types/domain'

type BoardHeaderProps = {
  board: Board
  workspaceId?: string
  workspaceName?: string
  spaceId?: string
  spaceName?: string
  onAddColumn: () => void
  onAskAgent?: () => void
}

export function BoardHeader({
  board,
  workspaceId,
  workspaceName,
  spaceId,
  spaceName,
  onAddColumn,
  onAskAgent,
}: BoardHeaderProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const archived = Boolean(board.archived) || board.isActive === false
  const presence = useBoardPresence(board.id)

  const [archiveBoard, { isLoading: archiving }] = useArchiveBoardMutation()
  const [restoreBoard, { isLoading: restoring }] = useRestoreBoardMutation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!spaceId) return
    setError(null)
    try {
      if (archived) {
        await restoreBoard({ id: board.id, spaceId }).unwrap()
      } else {
        await archiveBoard({ id: board.id, spaceId }).unwrap()
        navigate(`/spaces/${spaceId}`)
      }
      setConfirmOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('archive.errorTitle')))
    }
  }

  return (
    <section>
      <PageBreadcrumbs
        items={[
          { label: t('common.dashboard'), to: '/dashboard' },
          ...(workspaceId
            ? [
                {
                  label: workspaceName?.trim() || t('workspace.fallbackName'),
                  to: `/workspaces/${workspaceId}`,
                },
              ]
            : []),
          ...(spaceId
            ? [
                {
                  label: spaceName?.trim() || t('space.fallbackName'),
                  to: `/spaces/${spaceId}`,
                },
              ]
            : []),
          { label: board.name },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary"
            aria-hidden
          >
            {board.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t('board.eyebrow')}
              </p>
              {archived ? (
                <Badge variant="outline" className="text-[10px]">
                  {t('space.statusArchived')}
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{board.name}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {board.description?.trim() || t('board.defaultDescription')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {presence.length > 0 ? <BoardPresenceDots users={presence} /> : null}
          <div className="flex flex-wrap gap-2">
            {spaceId ? (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setError(null)
                  setConfirmOpen(true)
                }}
              >
                {archived ? (
                  <RotateCcw className="h-4 w-4" aria-hidden />
                ) : (
                  <Archive className="h-4 w-4" aria-hidden />
                )}
                {archived ? t('archive.restore') : t('archive.archive')}
              </Button>
            ) : null}
            {!archived && onAskAgent ? (
              <Button variant="outline" onClick={onAskAgent} className="gap-1.5">
                <Bot className="h-4 w-4" aria-hidden />
                {t('ai.askAgent')}
              </Button>
            ) : null}
            {!archived ? (
              <Button variant="outline" onClick={onAddColumn} className="gap-1.5">
                <Columns3 className="h-4 w-4" aria-hidden />
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t('board.addColumn')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <ArchiveConfirmModal
        open={confirmOpen}
        mode={archived ? 'restore' : 'archive'}
        entityLabel={t('archive.entityBoard')}
        name={board.name}
        busy={archiving || restoring}
        error={error}
        onClose={() => {
          if (archiving || restoring) return
          setConfirmOpen(false)
          setError(null)
        }}
        onConfirm={confirm}
      />
    </section>
  )
}
