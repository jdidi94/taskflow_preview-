import { useState } from 'react'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'
import { Archive } from 'lucide-react'

import { ArchiveConfirmModal } from '@/components/common/ArchiveConfirmModal'
import { ArchivedEntityRow } from '@/components/common/ArchivedEntityRow'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useRestoreWorkspaceMutation } from '@/services/workspacesApi'
import type { Workspace } from '@/types/domain'

type Props = {
  workspaces: Workspace[]
  isLoading?: boolean
}

function isArchived(workspace: Workspace) {
  return Boolean(workspace.archived) || workspace.isActive === false
}

export function ArchivedWorkspacesWidget({ workspaces, isLoading }: Props) {
  const { t } = useI18n()
  const [restoreWorkspace, { isLoading: restoring }] = useRestoreWorkspaceMutation()
  const [pending, setPending] = useState<Workspace | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const archived = workspaces.filter(isArchived)

  function openRestore(workspace: Workspace) {
    setActionError(null)
    setPending(workspace)
  }

  async function confirmRestore() {
    if (!pending) return
    setActionError(null)
    try {
      await restoreWorkspace(pending.id).unwrap()
      setPending(null)
    } catch (err) {
      setActionError(getApiErrorMessage(err, t('archive.errorTitle')))
    }
  }

  if (!isLoading && archived.length === 0) return null

  return (
    <>
      <Card className="border-border/50 bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base text-muted-foreground">
              {t('dashboard.archivedTitle')}
            </CardTitle>
            <Badge variant="outline">{archived.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t('dashboard.archivedSubtitle')}</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {archived.map((workspace) => (
                <ArchivedEntityRow
                  key={workspace.id}
                  title={workspace.name}
                  description={workspace.description?.trim() || t('dashboard.noDescription')}
                  to={`/workspaces/${workspace.id}`}
                  onRestore={() => openRestore(workspace)}
                  meta={
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {t('dashboard.statusArchived')}
                    </Badge>
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ArchiveConfirmModal
        open={Boolean(pending)}
        mode="restore"
        entityLabel={t('archive.entityWorkspace')}
        name={pending?.name ?? ''}
        busy={restoring}
        error={actionError}
        onClose={() => {
          if (restoring) return
          setPending(null)
          setActionError(null)
        }}
        onConfirm={confirmRestore}
      />
    </>
  )
}
