import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@taskflow/ui'
import { Activity, Radio, RefreshCw, Trash2 } from 'lucide-react'

import { useI18n } from '@/i18n'
import {
  clearSocketLogs,
  ensureDiagnosticSockets,
  getBoardSocket,
  getNotificationSocket,
  getSocketLogs,
  getSocketStatuses,
  pushSocketLog,
  reconnectAllSockets,
  subscribeSocketDiagnostics,
  type SocketLogEntry,
  type SocketNamespaceStatus,
} from '@/lib/socket'

export function SocketLogsPanel() {
  const { t } = useI18n()
  const { boardId: routeBoardId } = useParams()
  const [statuses, setStatuses] = useState<SocketNamespaceStatus[]>(() => getSocketStatuses())
  const [entries, setEntries] = useState<SocketLogEntry[]>(() => getSocketLogs())
  const [boardId, setBoardId] = useState(routeBoardId ?? '')
  const [pingNote, setPingNote] = useState<string | null>(null)

  useEffect(() => {
    ensureDiagnosticSockets()
    return subscribeSocketDiagnostics(() => {
      setStatuses(getSocketStatuses())
      setEntries(getSocketLogs())
    })
  }, [])

  useEffect(() => {
    if (routeBoardId) setBoardId(routeBoardId)
  }, [routeBoardId])

  function onReconnect() {
    setPingNote(null)
    reconnectAllSockets()
    pushSocketLog('client', 'info', 'Reconnect requested')
  }

  function onPing() {
    setPingNote(null)
    try {
      const socket = getNotificationSocket()
      const onPong = (payload: unknown) => {
        pushSocketLog('/notifications', 'event', 'test:pong', payload)
        setPingNote(t('socketLogs.pongOk'))
        socket.off('test:pong', onPong)
      }
      socket.on('test:pong', onPong)
      socket.emit('test:ping', { from: 'socket-logs', at: new Date().toISOString() })
      pushSocketLog('/notifications', 'emit', 'test:ping')
    } catch (err) {
      setPingNote(err instanceof Error ? err.message : t('socketLogs.pingFailed'))
    }
  }

  function onJoinBoard() {
    const id = boardId.trim()
    if (!id) return
    try {
      const socket = getBoardSocket()
      socket.emit('board:join', { boardId: id })
      pushSocketLog('/board', 'emit', `board:join ${id}`)
    } catch (err) {
      pushSocketLog(
        '/board',
        'error',
        err instanceof Error ? err.message : t('socketLogs.joinFailed'),
      )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onReconnect} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          {t('socketLogs.reconnect')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onPing} className="gap-1.5">
          <Radio className="h-3.5 w-3.5" aria-hidden />
          {t('socketLogs.ping')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => clearSocketLogs()}
          className="gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {t('socketLogs.clear')}
        </Button>
      </div>

      {pingNote ? <Alert variant="info" title={pingNote} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {statuses.map((status) => (
          <Card key={status.namespace}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-mono text-sm font-medium">{status.namespace}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {status.socketId
                    ? t('socketLogs.socketId', { id: status.socketId })
                    : t('socketLogs.noSocketId')}
                </p>
                {status.lastError ? (
                  <p className="mt-1 text-xs text-destructive">{status.lastError}</p>
                ) : null}
              </div>
              <Badge variant={status.connected ? 'success' : 'outline'}>
                {status.connected ? t('socketLogs.connected') : t('socketLogs.disconnected')}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('socketLogs.joinTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">{t('socketLogs.boardId')}</span>
            <Input
              value={boardId}
              onChange={(event) => setBoardId(event.target.value)}
              placeholder={t('socketLogs.boardIdPlaceholder')}
            />
          </label>
          <Button type="button" size="sm" variant="primary" onClick={onJoinBoard} disabled={!boardId.trim()}>
            {t('socketLogs.joinBoard')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" aria-hidden />
            {t('socketLogs.feedTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('socketLogs.feedEmpty')}</p>
          ) : (
            <ul className="max-h-[min(28rem,55vh)] space-y-2 overflow-y-auto font-mono text-xs">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {entry.kind}
                    </Badge>
                    <span className="text-muted-foreground">{entry.namespace}</span>
                    <span className="ms-auto text-muted-foreground">
                      {new Date(entry.at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-foreground">{entry.message}</p>
                  {entry.data !== undefined ? (
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[10px] text-muted-foreground">
                      {JSON.stringify(entry.data, null, 0)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
