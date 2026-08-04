import { useEffect, useState } from 'react'
import { Alert, Button, Input, Loading, Modal } from '@taskflow/ui'
import { HardDrive, Link2, Search } from 'lucide-react'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useAttachDriveFileMutation,
  useGetDriveStatusQuery,
  useLazyGetDriveAuthUrlQuery,
  useLazyListDriveFilesQuery,
  useLinkDriveMutation,
  useLinkExternalFileMutation,
  type DriveListedFile,
} from '@/services/filesApi'

type DriveAttachModalProps = {
  open: boolean
  taskId: string
  boardId: string
  onClose: () => void
}

function driveRedirectUri() {
  return `${window.location.origin}/auth/drive-link-callback`
}

export function DriveAttachModal({ open, taskId, boardId, onClose }: DriveAttachModalProps) {
  const { t } = useI18n()
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } =
    useGetDriveStatusQuery(undefined, { skip: !open })
  const [fetchAuthUrl] = useLazyGetDriveAuthUrlQuery()
  const [linkDrive, { isLoading: linking }] = useLinkDriveMutation()
  const [listDrive, listState] = useLazyListDriveFilesQuery()
  const [attachDrive, { isLoading: attaching }] = useAttachDriveFileMutation()
  const [linkExternal, { isLoading: linkingUrl }] = useLinkExternalFileMutation()

  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState<DriveListedFile[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [urlDraft, setUrlDraft] = useState('')
  const [urlName, setUrlName] = useState('')

  const status = statusData?.data
  const linked = Boolean(status?.linked)
  const configured = Boolean(status?.configured)

  useEffect(() => {
    if (!open || !linked) return
    void loadFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, linked])

  useEffect(() => {
    if (!open) return

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const data = event.data as { type?: string; code?: string; error?: string }
      if (data?.type === 'DRIVE_LINK_OAUTH_ERROR') {
        setError(data.error || t('files.driveLinkError'))
        return
      }
      if (data?.type === 'DRIVE_LINK_OAUTH_SUCCESS' && data.code) {
        void (async () => {
          setError(null)
          try {
            await linkDrive({ code: data.code!, redirectUri: driveRedirectUri() }).unwrap()
            await refetchStatus()
          } catch (err) {
            setError(getApiErrorMessage(err, t('files.driveLinkError')))
          }
        })()
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [open, linkDrive, refetchStatus, t])

  async function loadFiles(pageToken?: string, append = false) {
    setError(null)
    try {
      const result = await listDrive({
        pageToken,
        q: query.trim()
          ? `trashed=false and name contains '${query.trim().replace(/'/g, "\\'")}'`
          : undefined,
      }).unwrap()
      setFiles((prev) => (append ? [...prev, ...result.data.files] : result.data.files))
      setNextPageToken(result.data.nextPageToken)
    } catch (err) {
      setError(getApiErrorMessage(err, t('files.driveListError')))
    }
  }

  async function connectDrive() {
    setError(null)
    try {
      const result = await fetchAuthUrl({ redirectUri: driveRedirectUri() }).unwrap()
      const popup = window.open(result.data.url, 'drive-oauth', 'width=520,height=720')
      if (!popup) setError(t('files.drivePopupBlocked'))
    } catch (err) {
      setError(getApiErrorMessage(err, t('files.driveNotConfigured')))
    }
  }

  async function onAttach(file: DriveListedFile) {
    setError(null)
    try {
      await attachDrive({ driveFileId: file.id, taskId, boardId }).unwrap()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.attachmentError')))
    }
  }

  async function onLinkUrl() {
    const url = urlDraft.trim()
    if (!url) return
    setError(null)
    try {
      await linkExternal({
        source: 'url',
        originalName: urlName.trim() || url,
        externalUrl: url,
        taskId,
        boardId,
      }).unwrap()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.attachmentError')))
    }
  }

  const busy = linking || attaching || linkingUrl || listState.isFetching

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (busy) return
        onClose()
      }}
      title={t('files.attachFromSources')}
      description={t('files.attachFromSourcesHint')}
    >
      <div className="mt-4 flex flex-col gap-5">
        {error ? <Alert variant="error" title={t('board.attachmentError')} description={error} /> : null}

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HardDrive className="h-4 w-4 text-muted-foreground" aria-hidden />
            {t('files.googleDrive')}
          </div>

          {statusLoading ? <Loading label={t('common.loading')} /> : null}

          {!statusLoading && !configured ? (
            <p className="text-sm text-muted-foreground">{t('files.driveNotConfigured')}</p>
          ) : null}

          {!statusLoading && configured && !linked ? (
            <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => void connectDrive()}>
              {linking ? t('files.driveConnecting') : t('files.driveConnect')}
            </Button>
          ) : null}

          {!statusLoading && linked ? (
            <>
              <p className="text-xs text-muted-foreground">
                {t('files.driveLinkedAs', { email: status?.email || '—' })}
              </p>
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('files.driveSearchPlaceholder')}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={busy}
                  onClick={() => void loadFiles()}
                >
                  <Search className="h-3.5 w-3.5" aria-hidden />
                  {t('files.driveSearch')}
                </Button>
              </div>

              {listState.isLoading ? <Loading label={t('common.loading')} /> : null}

              <ul className="max-h-56 space-y-2 overflow-y-auto">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{file.mimeType}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void onAttach(file)}
                    >
                      {t('files.attach')}
                    </Button>
                  </li>
                ))}
              </ul>

              {files.length === 0 && !listState.isLoading ? (
                <p className="text-xs text-muted-foreground">{t('files.driveEmpty')}</p>
              ) : null}

              {nextPageToken ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void loadFiles(nextPageToken, true)}
                >
                  {t('pagination.next')}
                </Button>
              ) : null}
            </>
          ) : null}
        </section>

        <section className="flex flex-col gap-2 border-t border-border/60 pt-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            {t('files.linkUrl')}
          </div>
          <Input
            value={urlName}
            onChange={(e) => setUrlName(e.target.value)}
            placeholder={t('files.linkUrlName')}
          />
          <Input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder={t('files.linkUrlPlaceholder')}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || !urlDraft.trim()}
              onClick={() => void onLinkUrl()}
            >
              {t('files.attach')}
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  )
}
