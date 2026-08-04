import { useEffect, useState } from 'react'
import { Alert, Button } from '@taskflow/ui'
import { HardDrive, Paperclip, Trash2 } from 'lucide-react'

import { DriveAttachModal } from '@/components/board/DriveAttachModal'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useDeleteFileMutation,
  useLazyGetFileQuery,
  useUploadTaskAttachmentsMutation,
} from '@/services/filesApi'
import { useUpdateTaskMutation } from '@/services/tasksApi'
import type { Task, TaskFile } from '@/types/domain'

type TaskAttachmentsSectionProps = {
  task: Task
  boardId: string
  disabled?: boolean
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function sourceKey(source: string | undefined): MessageKey {
  if (source === 'google_drive') return 'files.sourceDrive'
  if (source === 'url') return 'files.sourceUrl'
  return 'files.sourceLocal'
}

export function TaskAttachmentsSection({ task, boardId, disabled }: TaskAttachmentsSectionProps) {
  const { t } = useI18n()
  const [files, setFiles] = useState<TaskFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [driveOpen, setDriveOpen] = useState(false)

  const [fetchFile] = useLazyGetFileQuery()
  const [upload, { isLoading: uploading }] = useUploadTaskAttachmentsMutation()
  const [deleteFile, { isLoading: deleting }] = useDeleteFileMutation()
  const [updateTask] = useUpdateTaskMutation()

  const attachmentIds = (task.attachments ?? []).map(String)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (attachmentIds.length === 0) {
        setFiles([])
        return
      }
      setLoadingMeta(true)
      try {
        const rows: TaskFile[] = []
        for (const id of attachmentIds) {
          try {
            const result = await fetchFile(id).unwrap()
            rows.push(result.data)
          } catch {
            rows.push({
              id,
              originalName: id,
              mimeType: 'application/octet-stream',
              size: 0,
              url: '',
            })
          }
        }
        if (!cancelled) setFiles(rows)
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when attachment id list changes
  }, [attachmentIds.join(',')])

  async function handleUpload(list: FileList | null) {
    if (!list || list.length === 0) return
    setError(null)
    try {
      await upload({
        files: Array.from(list),
        taskId: task.id,
        boardId,
      }).unwrap()
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.attachmentError')))
    }
  }

  async function handleDelete(fileId: string) {
    setError(null)
    try {
      await deleteFile({ id: fileId, boardId, taskId: task.id }).unwrap()
      const next = attachmentIds.filter((id) => id !== fileId)
      await updateTask({
        id: task.id,
        boardId,
        attachments: next,
      }).unwrap()
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.attachmentError')))
    }
  }

  const busy = Boolean(disabled || uploading || deleting || loadingMeta)

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t('board.attachments')}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-primary">
            <Paperclip className="h-3.5 w-3.5" aria-hidden />
            {uploading ? t('board.uploading') : t('board.addAttachment')}
            <input
              type="file"
              className="sr-only"
              multiple
              disabled={busy}
              onChange={(e) => {
                void handleUpload(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs text-primary disabled:opacity-50"
            disabled={busy}
            onClick={() => setDriveOpen(true)}
          >
            <HardDrive className="h-3.5 w-3.5" aria-hidden />
            {t('files.fromDrive')}
          </button>
        </div>
      </div>

      {error ? (
        <Alert variant="error" title={t('board.attachmentError')} description={error} />
      ) : null}

      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('board.attachmentsEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                {file.url ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium text-primary hover:underline"
                  >
                    {file.originalName}
                  </a>
                ) : (
                  <p className="truncate text-sm font-medium">{file.originalName}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {t(sourceKey(file.source))}
                  {' · '}
                  {file.mimeType}
                  {file.size > 0 ? ` · ${formatSize(file.size)}` : ''}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={() => void handleDelete(file.id)}
                aria-label={t('common.delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <DriveAttachModal
        open={driveOpen}
        taskId={task.id}
        boardId={boardId}
        onClose={() => setDriveOpen(false)}
      />
    </section>
  )
}
