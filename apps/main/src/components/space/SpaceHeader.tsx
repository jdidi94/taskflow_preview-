import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button } from '@taskflow/ui'
import { Archive, Plus, RotateCcw } from 'lucide-react'

import { ArchiveConfirmModal } from '@/components/common/ArchiveConfirmModal'
import { PageHero } from '@/components/common/PageHero'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useArchiveSpaceMutation, useRestoreSpaceMutation } from '@/services/spacesApi'
import type { Space } from '@/types/domain'

type SpaceHeaderProps = {
  space?: Space
  workspaceId?: string
  workspaceName?: string
  onCreateBoard: () => void
}

export function SpaceHeader({
  space,
  workspaceId,
  workspaceName,
  onCreateBoard,
}: SpaceHeaderProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const name = space?.name ?? t('space.fallbackName')
  const archived = Boolean(space?.archived) || space?.isActive === false

  const [archiveSpace, { isLoading: archiving }] = useArchiveSpaceMutation()
  const [restoreSpace, { isLoading: restoring }] = useRestoreSpaceMutation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!space || !workspaceId) return
    setError(null)
    try {
      if (archived) {
        await restoreSpace({ id: space.id, workspaceId }).unwrap()
      } else {
        await archiveSpace({ id: space.id, workspaceId }).unwrap()
        navigate(`/workspaces/${workspaceId}`)
      }
      setConfirmOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('archive.errorTitle')))
    }
  }

  return (
    <>
      <PageHero
        breadcrumbs={[
          { label: t('common.dashboard'), to: '/dashboard' },
          ...(workspaceId
            ? [
                {
                  label: workspaceName?.trim() || t('workspace.fallbackName'),
                  to: `/workspaces/${workspaceId}`,
                },
              ]
            : []),
          { label: name },
        ]}
        title={name}
        description={space?.description?.trim() || t('space.defaultDescription')}
        meta={
          archived ? (
            <Badge variant="outline" className="text-[10px]">
              {t('space.statusArchived')}
            </Badge>
          ) : null
        }
        secondary={
          space && workspaceId ? (
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
          ) : null
        }
        action={
          !archived ? (
            <Button variant="primary" onClick={onCreateBoard} className="gap-1.5">
              <Plus className="h-4 w-4" aria-hidden />
              {t('space.newBoard')}
            </Button>
          ) : undefined
        }
      />

      {space ? (
        <ArchiveConfirmModal
          open={confirmOpen}
          mode={archived ? 'restore' : 'archive'}
          entityLabel={t('archive.entitySpace')}
          name={space.name}
          busy={archiving || restoring}
          error={error}
          onClose={() => {
            if (archiving || restoring) return
            setConfirmOpen(false)
            setError(null)
          }}
          onConfirm={confirm}
        />
      ) : null}
    </>
  )
}
