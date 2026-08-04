import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button } from '@taskflow/ui'
import { Archive, Plus, RotateCcw } from 'lucide-react'

import { ArchiveConfirmModal } from '@/components/common/ArchiveConfirmModal'
import { PageHero } from '@/components/common/PageHero'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useArchiveWorkspaceMutation,
  useRestoreWorkspaceMutation,
} from '@/services/workspacesApi'
import type { Workspace } from '@/types/domain'

type WorkspaceHeaderProps = {
  workspace?: Workspace
  onCreateSpace: () => void
}

export function WorkspaceHeader({ workspace, onCreateSpace }: WorkspaceHeaderProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const name = workspace?.name ?? t('workspace.fallbackName')
  const archived = Boolean(workspace?.archived) || workspace?.isActive === false

  const [archiveWorkspace, { isLoading: archiving }] = useArchiveWorkspaceMutation()
  const [restoreWorkspace, { isLoading: restoring }] = useRestoreWorkspaceMutation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!workspace) return
    setError(null)
    try {
      if (archived) {
        await restoreWorkspace(workspace.id).unwrap()
      } else {
        await archiveWorkspace(workspace.id).unwrap()
        navigate('/dashboard')
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
          { label: name },
        ]}
        title={name}
        description={workspace?.description?.trim() || t('workspace.defaultDescription')}
        meta={
          <>
            {archived ? (
              <Badge variant="outline" className="text-[10px]">
                {t('workspace.statusArchived')}
              </Badge>
            ) : null}
            {workspace?.githubOrg?.login ? (
              <Badge variant="secondary" className="text-[10px]">
                {t('github.badge', { org: workspace.githubOrg.login })}
              </Badge>
            ) : null}
          </>
        }
        secondary={
          workspace ? (
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
            <Button variant="primary" onClick={onCreateSpace} className="gap-1.5">
              <Plus className="h-4 w-4" aria-hidden />
              {t('workspace.newSpace')}
            </Button>
          ) : undefined
        }
      />

      {workspace ? (
        <ArchiveConfirmModal
          open={confirmOpen}
          mode={archived ? 'restore' : 'archive'}
          entityLabel={t('archive.entityWorkspace')}
          name={workspace.name}
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
